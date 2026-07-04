import type { Design } from '../src/types.ts';
import { FURNITURE_CATALOG } from '../src/lib/furnitureCatalog.ts';
import { floorPolygon, signedArea, wallDir, wallLen } from '../src/lib/polygon.ts';

export const SYSTEM_PROMPT = `Du är en erfaren inredningsarkitekt. Du får ett rum (geometri i JSON) och
användarens behov, och tar fram konkreta möbleringsförslag.

## Koordinatsystem och riktning
- Golvplanet är (x, z) i meter; y pekar uppåt och är alltid 0 för placeringar.
- En möbels position är fotavtryckets centrum.
- Du anger INTE rotation direkt. I stället beskriver du riktning semantiskt:
  - "facing": en punkt (x, z) i rummet som möbelns FRAMSIDA ska peka mot. Se katalogens
    "framsida" för var framsidan sitter på varje möbeltyp. Exempel: en stols facing =
    bordets mittpunkt; en soffas facing = rummets mitt eller TV:n; en garderobs facing =
    en punkt en bit ut i rummet, bort från väggen den står vid.
  - "againstWall": true om ryggen ska stå dikt mot närmaste vägg (garderob, bokhylla,
    säng, soffa, TV-bänk). Servern snäppar då möbeln flush mot väggen och vänder framsidan
    rätt automatiskt — du behöver bara sätta position ungefär rätt och peka facing utåt.
  - Servern räknar ut och snäpper rotationen (kvartsvarv) åt facing-hållet. Tänk alltså på
    var framsidan ska vara vänd, inte på gradtal: skrivbordsstolen mot skrivbordet,
    garderobsdörrarna ut mot rummet, soffans sittsida mot rummet.
- elevation är underkantens höjd över golvet i meter: 0 för allt som står på golvet,
  > 0 för väggmonterat (t.ex. hylla ovanför skrivbordet). Väggmonterade möbler ska
  ligga dikt an mot en vägg och får inte sluta ovanför takhöjden.
- Rummet begränsas av golvpolygonen; eventuella innerväggar delar av ytan.

## Hårda krav (kontrolleras maskinellt — bryt aldrig mot dessa)
- Hela möbelns fotavtryck (alla fyra hörn, med hänsyn till rotation) ska ligga innanför golvpolygonen.
- Framför varje dörr ska en zon lika bred som dörren och 0,8 m djup vara helt fri (dörrsvep). Mattor är undantagna.
- Möbler får inte överlappa varandra. Undantag: mattor får ligga under andra möbler, och stolar får skjutas in under bord/arbetsytor.
- Varje möbel som används dagligen måste gå att NÅ: framför dess framsida ska katalogens
  angivna fria yta ("fri yta framför") vara ledig OCH ha en obruten gångväg tillbaka till en
  dörr. Ställ aldrig en möbel så att den blir instängd bakom andra möbler eller i ett hörn
  utan väg fram (t.ex. ett lekbord bakom en garderob).
- Lämna minst 0,7 m fri passage genom rummet och till varje möbel som används dagligen.
- Blockera inte fönster med möbler högre än 1,2 m.
- Garderober och bokhyllor ska stå med ryggen mot en vägg (againstWall = true).

## Mjuka principer (tillämpa och motivera)
Feng shui:
- Säng i kommandoposition: från sängen ser man dörren, men sängen står inte i linje med dörröppningen.
- Sängens huvudgavel mot en solid vägg, helst inte under ett fönster. Nattduksbord på båda sidor om plats finns.
- Soffa med ryggen mot en vägg, inte flytande med ryggen mot dörren.
- Mjuka, obrutna rörelseflöden från dörr in i rummet; ingen möbel som första hinder innanför dörren.
- Balans: undvik att all tyngd hamnar på en sida av rummet.
Ergonomi och funktion:
- Skrivbord/arbetsplats nära fönster med dagsljus snett från sidan.
- Ca 0,6 m bordskant per sittplats vid matbord; stolar behöver 0,75 m bakom bordskanten för att dras ut.
- Soffa–soffbord ca 0,4 m; soffa–TV/bokhylla minst 2 m vid tittavstånd.
- Sängsidor som används behöver ca 0,6 m fri yta.

## Uppgift
Ta fram 2–3 medvetet olika förslag (t.ex. "maximera yta", "maximera mys", "fokus arbete").
Varje förslag: titel, kort koncept och en komplett möblering som uppfyller användarens behov.
Utgå från katalogens standardmått men justera storlekar rimligt vid behov (t.ex. säng 1,4/1,6/1,8 m).
Använd "box" med beskrivande namn för möbler som saknas i katalogen (t.ex. skrivbord, TV-bänk, fåtölj).
Välj färger som ger en sammanhållen palett per förslag. Skriv alla texter på svenska.
Svara enbart enligt det givna JSON-schemat.`;

const round = (v: number) => Math.round(v * 1000) / 1000;

/** Kompakt, självförklarande rumsbeskrivning för modellen. */
function serializeRoom(design: Design) {
  const poly = floorPolygon(design.walls);
  return {
    takhojd_m: design.room.height,
    golvyta_m2: round(Math.abs(signedArea(poly))),
    golvpolygon: poly,
    vaggar: design.walls.map((w) => ({
      id: w.id,
      typ: w.kind === 'exterior' ? 'yttervägg' : 'innervägg',
      fran: w.a,
      till: w.b,
      langd_m: round(wallLen(w)),
    })),
    oppningar: design.openings.map((o) => {
      const wall = design.walls.find((w) => w.id === o.wallId);
      if (!wall) return { typ: o.kind, vagg: o.wallId, fel: 'väggen saknas' };
      const d = wallDir(wall);
      return {
        typ: o.kind === 'door' ? 'dörr' : 'fönster',
        vagg: o.wallId,
        fran: { x: round(wall.a.x + d.x * o.offset), z: round(wall.a.z + d.z * o.offset) },
        till: {
          x: round(wall.a.x + d.x * (o.offset + o.width)),
          z: round(wall.a.z + d.z * (o.offset + o.width)),
        },
        bredd_m: o.width,
        underkant_m: o.elevation,
        hojd_m: o.height,
      };
    }),
  };
}

export function buildUserPrompt(design: Design, needs: string): string {
  const catalog = Object.entries(FURNITURE_CATALOG).map(([kind, e]) => ({
    kind,
    namn: e.label,
    standardmatt_m: e.defaultSize,
    framsida: e.front,
    fri_yta_framfor_m: e.accessDepth,
  }));
  return [
    '## Rummet',
    JSON.stringify(serializeRoom(design), null, 1),
    '',
    '## Möbelkatalog',
    JSON.stringify(catalog, null, 1),
    '',
    '## Användarens behov',
    needs.trim(),
  ].join('\n');
}

export function buildRepairPrompt(errors: string[]): string {
  return [
    'Den maskinella kontrollen hittade följande fel i ditt förslag:',
    ...errors.map((e) => `- ${e}`),
    '',
    'Rätta felen och svara med SAMTLIGA förslag på nytt, kompletta och enligt samma JSON-schema.',
    'Flytta eller ta bort de möbler som bryter mot kraven; behåll allt som redan är korrekt.',
  ].join('\n');
}
