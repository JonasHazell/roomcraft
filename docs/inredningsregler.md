# Inredningsregler — regelkatalog för regelmotor

Detta dokument är en strukturerad katalog över regler för inredning av bostäder: byggnorm och svensk standard, internationella riktlinjer, branschens best practice samt feng shui. Reglerna är sorterade i fallande viktighetsordning (nivå 5 → 1) och skrivna så att varje regel kan översättas till en maskinell kontroll.

## Fältschema

Varje regel har följande fält:

| Fält | Betydelse |
|---|---|
| **ID** | Unik identifierare med kategoriprefix (SAF, ACC, ERG, FEN, LGT, COL, ACO, AES) |
| **Kategori** | Säkerhet, Tillgänglighet, Ergonomi & mått, Feng shui, Ljus, Färg & textil, Akustik & luft, Estetik |
| **Rum** | Rumstyp(er) regeln gäller — `Alla` om rumsoberoende |
| **Viktighet** | 5 = kritisk … 1 = finlir (se skala nedan) |
| **Mätbarhet** | `A` = automatiskt mätbar från planritning/modell (geometri, mått, placering) · `D` = delvis — kräver metadata om objekt (t.ex. materialtyp, ljuskälla) · `M` = manuell — kräver fråga till användaren eller foto |
| **Villkor** | Det mätbara/prövbara villkoret. Uppfyllt villkor = godkänd regel |
| **Källa** | Norm, standard eller tradition regeln vilar på |
| **Åtgärd** | Mall för förbättringsförslag när regeln bryts |

## Viktighetsskala

| Nivå | Namn | Innebörd | Förslag på poängvikt |
|---|---|---|---|
| 5 | Kritisk | Person- eller brandsäkerhet. Brott bör alltid flaggas rött | 16 |
| 4 | Grundfunktion | Rummet går inte att använda som avsett, eller utestänger personer med funktionsnedsättning | 8 |
| 3 | Ergonomi & placering | Etablerade mått och placeringar för komfort och välbefinnande — här ingår feng shui-reglernas kärna | 4 |
| 2 | Komfort & atmosfär | Ljus, färg, akustik, ordning, energiflöde | 2 |
| 1 | Estetik & finlir | Styling, proportion, harmoni | 1 |

**Betygsförslag:** totalpoäng = Σ(vikt × uppfylld) / Σ(vikt × tillämplig), beräknat per kategori och totalt. Regler med mätbarhet `M` bör kunna undantas ur betyget och i stället visas som checklista. Feng shui-kategorin bör kunna slås av/på som helhet för användare som inte vill ha den, men viktas som övriga kategorier när den är på.

**Källförbehåll:** BBR- och SS-regler är krav vid nybyggnad/ändring, inte vid möblering av befintlig bostad — regelmotorn använder dem som kvalitetsmått. Feng shui-regler vilar på tradition (formskolan/kompasskolan), inte på standard; de anges med källan `Feng shui`.

---

# Nivå 5 — Kritiska regler (säkerhet)

### SAF-01 — Utrymningsväg får inte blockeras
- **Kategori:** Säkerhet · **Rum:** Alla · **Viktighet:** 5 · **Mätbarhet:** A
- **Villkor:** Fri passage ≥ 80 cm från varje vistelseyta (säng, sittgrupp, matplats, arbetsplats) till minst en utrymningsväg (dörr eller öppningsbart fönster). Ingen möbel står i vägen.
- **Källa:** BBR 5:3 (utrymning), MSB
- **Åtgärd:** Flytta {möbel} så att vägen från {plats} till {utrymningsväg} blir fri (minst 80 cm bred).

### SAF-02 — Dörrar ska kunna öppnas helt
- **Kategori:** Säkerhet · **Rum:** Alla · **Viktighet:** 5 · **Mätbarhet:** A
- **Villkor:** Ingen möbel står inom någon dörrs uppställningsyta (dörrbladets svepyta). Dörren ska kunna öppnas minst 90°.
- **Källa:** BBR 5:3, best practice
- **Åtgärd:** Flytta {möbel} ut ur dörrens svepyta så att {dörr} kan öppnas helt.

### SAF-03 — Utrymningsfönster ska vara åtkomligt
- **Kategori:** Säkerhet · **Rum:** Sovrum, barnrum, vardagsrum · **Viktighet:** 5 · **Mätbarhet:** A
- **Villkor:** Om fönster utgör alternativ utrymningsväg: fri golvyta ≥ 60 cm framför fönstret, och inga höga möbler blockerar öppningen.
- **Källa:** BBR 5:323
- **Åtgärd:** Flytta {möbel} så att fönstret i {rum} kan nås och öppnas obehindrat.

### SAF-04 — Brandvarnare fri och rätt placerad
- **Kategori:** Säkerhet · **Rum:** Alla · **Viktighet:** 5 · **Mätbarhet:** D
- **Villkor:** Minst en brandvarnare per våningsplan (rekommenderat: en per sovrum + utanför sovrumsdörr), placerad i tak minst 50 cm från vägg, ej skymd av höga skåp eller hyllor.
- **Källa:** BBR 5:2513, MSB:s allmänna råd
- **Åtgärd:** Lägg till/flytta brandvarnare i {rum}; håll 50 cm fritt runt den.

### SAF-05 — Höga möbler ska vara tippsäkrade
- **Kategori:** Säkerhet · **Rum:** Alla, särskilt barnrum · **Viktighet:** 5 · **Mätbarhet:** D
- **Villkor:** Möbler högre än 75 cm som kan tippa (bokhyllor, byråer, garderober som ej är fast inredda) är förankrade i vägg. I barnrum gäller det alla klättringsbara möbler.
- **Källa:** Konsumentverket, IKEA/branschstandard, ASTM F2057 (int.)
- **Åtgärd:** Förankra {möbel} i vägg med tippskydd.

### SAF-06 — Skyddsavstånd runt eldstad och levande ljus
- **Kategori:** Säkerhet · **Rum:** Vardagsrum, kök · **Viktighet:** 5 · **Mätbarhet:** A
- **Villkor:** Brännbara möbler och textilier ≥ 100 cm framför braskamin/öppen spis; inga gardiner eller textilier inom 50 cm från eldstadens öppning. Eldstadsplan av obrännbart material framför öppningen.
- **Källa:** BBR 5:4, MSB
- **Åtgärd:** Flytta {möbel/textil} minst {avstånd} från eldstaden.

### SAF-07 — Spis fri från brännbart och rätt placerad
- **Kategori:** Säkerhet · **Rum:** Kök · **Viktighet:** 5 · **Mätbarhet:** A
- **Villkor:** Spis/häll placeras inte under fönster med gardiner och inte närmast intill öppningsbart fönster eller dörr; inga gardiner eller brännbar förvaring inom 50 cm i sidled från hällen; fritt ovanför hällen utom fläkt/kåpa.
- **Källa:** BBR 5:4, svensk kökspraxis, Elsäkerhetsverket
- **Åtgärd:** Placera spisen med minst 30–50 cm bänk mot fönster/dörr och ta bort gardiner intill hällen.

### SAF-08 — El i badrum enligt zonindelning
- **Kategori:** Säkerhet · **Rum:** Badrum · **Viktighet:** 5 · **Mätbarhet:** D
- **Villkor:** Inga uttag eller icke IP-klassade armaturer i zon 0–1 (i/ovanför badkar och dusch); zon 1 kräver minst IPX4 och SELV eller jordfelsbrytarskydd. Flyttbara lampor och elapparater placeras utom räckhåll från badkar/dusch.
- **Källa:** SS 436 40 00 (elinstallationsreglerna), Elsäkerhetsverket, IEC 60364-7-701
- **Åtgärd:** Ta bort {elobjekt} från zon {zon} eller ersätt med IP-klassad fast installation.

### SAF-09 — Sladdar och grenuttag ur gångstråk
- **Kategori:** Säkerhet · **Rum:** Alla · **Viktighet:** 5 · **Mätbarhet:** D
- **Villkor:** Inga lösa sladdar korsar gångstråk; grenuttag ligger inte under mattor eller inklämda bakom möbler; sladdvindor är utrullade vid hög last.
- **Källa:** Elsäkerhetsverket, MSB
- **Åtgärd:** Dra om {sladd} längs vägg/list eller flytta {möbel med elbehov} närmare uttag.

### SAF-10 — Tunga föremål inte ovanför liggande/sittande
- **Kategori:** Säkerhet · **Rum:** Sovrum, vardagsrum, barnrum · **Viktighet:** 5 · **Mätbarhet:** A
- **Villkor:** Inga tunga hyllor, stora tavlor med glas eller speglar hänger rakt ovanför säng, spjälsäng eller soffas huvudända. (Sammanfaller med feng shui-regeln FEN-06.)
- **Källa:** Best practice barnsäkerhet; Feng shui
- **Åtgärd:** Flytta {objekt} till en vägg utan säng/soffa under, eller ersätt med lätt, säkrad upphängning.

### SAF-11 — Glas i möbler och gångstråk
- **Kategori:** Säkerhet · **Rum:** Alla, särskilt barnfamilj · **Viktighet:** 5 · **Mätbarhet:** D
- **Villkor:** Glasbord och glasdörrar i/vid gångstråk är av härdat eller laminerat glas; glasbord med vassa hörn undviks i hem med små barn.
- **Källa:** SS-EN 12150 (härdat glas), Konsumentverket
- **Åtgärd:** Byt till härdat glas eller möbel med rundade hörn i {rum}.

### SAF-12 — Halksäkra mattor i gångstråk
- **Kategori:** Säkerhet · **Rum:** Hall, badrum, trappor · **Viktighet:** 5 · **Mätbarhet:** D
- **Villkor:** Lösa mattor i gångstråk och våtrum har halkskydd; inga uppvikta mattkanter i passager; inga lösa mattor i trappa.
- **Källa:** Best practice fallprevention (Socialstyrelsen äldresäkerhet)
- **Åtgärd:** Lägg halkskydd under {matta} eller ta bort den ur gångstråket.

### SAF-13 — Fönstersäkerhet i barnrum
- **Kategori:** Säkerhet · **Rum:** Barnrum · **Viktighet:** 5 · **Mätbarhet:** A
- **Villkor:** Inga klättringsbara möbler (säng, byrå, skrivbord) direkt under öppningsbart fönster ovan bottenvåning; fönster har spärranordning.
- **Källa:** BBR 8:231, Konsumentverket
- **Åtgärd:** Flytta {möbel} bort från fönstret eller montera fönsterspärr.

### SAF-14 — Element och ventilation får inte täckas
- **Kategori:** Säkerhet · **Rum:** Alla · **Viktighet:** 5 · **Mätbarhet:** A
- **Villkor:** Radiatorer täcks inte av tätt ställda möbler (soffa ≥ 10 cm från element, ej heltäckande framför) eller långa gardiner som hänger över; till- och frånluftsdon är fria.
- **Källa:** Best practice brand/energi, Boverket
- **Åtgärd:** Dra fram {möbel} minst 10 cm och korta gardinen ovanför elementet.

---

# Nivå 4 — Tillgänglighet och grundfunktion

### ACC-01 — Huvudpassager minst 90 cm
- **Kategori:** Tillgänglighet · **Rum:** Alla · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Gångstråk mellan rum och till bostadens huvudfunktioner ≥ 90 cm brett (bekvämt: 110 cm). Sekundära passager (t.ex. mellan soffbord och fåtölj) ≥ 60 cm.
- **Källa:** SS 91 42 21, BBR 3:1, NKBA (int.)
- **Åtgärd:** Vidga passagen vid {plats} från {uppmätt} till minst 90 cm genom att flytta {möbel}.

### ACC-02 — Vändyta för rullstol
- **Kategori:** Tillgänglighet · **Rum:** Alla · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Fri vändcirkel med diameter ≥ 130 cm (normalnivå; 150 cm för höjd nivå/ADA) finns i entré, kök, badrum, sovrum och vardagsrum.
- **Källa:** SS 91 42 21, BBR 3:146, ADA (int.)
- **Åtgärd:** Frigör en cirkel på 130 cm i {rum} genom att flytta {möbel}.

### ACC-03 — Fritt passagemått i dörrar
- **Kategori:** Tillgänglighet · **Rum:** Alla · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Fritt passagemått i dörröppningar ≥ 80 cm när dörren är uppställd 90°; inga möbler smalnar av öppningen.
- **Källa:** BBR 3:143, SS 91 42 21
- **Åtgärd:** Flytta {möbel} som gör passagen genom {dörr} smalare än 80 cm.

### ACC-04 — Manöveryta vid dörrens handtagssida
- **Kategori:** Tillgänglighet · **Rum:** Alla · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Fri yta ≥ 70 cm bredvid dörrens handtagssida (på dragsidan) så att dörren kan öppnas av person med rullstol eller rollator.
- **Källa:** SS 91 42 21
- **Åtgärd:** Håll 70 cm fritt intill handtagssidan på {dörr}.

### ACC-05 — Åtkomst runt sängen
- **Kategori:** Tillgänglighet · **Rum:** Sovrum · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Dubbelsäng nås från båda långsidorna med ≥ 60 cm fritt (bekvämt 70–80 cm); enkelsäng från minst en långsida. Vid fotänden ≥ 60 cm om den ingår i gångstråk. Bäddbart utrymme enligt SS: 80 cm vid ena långsidan.
- **Källa:** SS 91 42 21, best practice
- **Åtgärd:** Flytta sängen så att {sida} får minst 60 cm fri bredd.

### ACC-06 — Fri yta framför förvaring
- **Kategori:** Tillgänglighet · **Rum:** Sovrum, hall · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** ≥ 110 cm fri yta framför garderober och byråer (utdragen låda/öppen dörr + person). Minst 70 cm om möbeln används sällan.
- **Källa:** SS 91 42 21
- **Åtgärd:** Frigör 110 cm framför {förvaringsmöbel}.

### ACC-07 — Utrymme vid matplatsen
- **Kategori:** Tillgänglighet · **Rum:** Matplats, kök · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** ≥ 60 cm bordsbredd per sittplats; ≥ 70 cm från bordskant till vägg/möbel bakom stol (för att dra ut och resa sig); ≥ 110 cm om andra ska passera bakom sittande.
- **Källa:** SS 91 42 21, NKBA
- **Åtgärd:** Dra bordet {riktning} eller minska antalet kuvert; bakom {stol} finns bara {uppmätt} cm.

### ACC-08 — Arbetsyta i kök: fri golvyta framför inredning
- **Kategori:** Tillgänglighet · **Rum:** Kök · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** ≥ 110 cm fri golvyta framför bänkskåp, spis, diskmaskin och kyl (120 cm mellan motstående bänkrader i parallellkök). Öppnad diskmaskins- eller ugnslucka blockerar inte enda passagen.
- **Källa:** SS 91 42 21, BBR 3:1, NKBA
- **Åtgärd:** Frigör golvytan framför {enhet}; flytta {möbel}.

### ACC-09 — Fri yta i badrum
- **Kategori:** Tillgänglighet · **Rum:** Badrum · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Fri yta framför tvättställ ≥ 70 × 110 cm; bredvid WC-stol ≥ 80 cm på ena sidan för överflyttning (höjd nivå); inga lösa möbler som krymper manöverytan under 130 cm cirkel.
- **Källa:** SS 91 42 21, BBR 3:146
- **Åtgärd:** Ta bort/flytta {objekt} för att återställa fri yta vid {enhet}.

### ACC-10 — Entréns basfunktioner
- **Kategori:** Tillgänglighet · **Rum:** Hall · **Viktighet:** 4 · **Mätbarhet:** D
- **Villkor:** Innanför entrédörren finns fri yta ≥ 130 cm, sittmöjlighet för på-/avklädning, avlastningsyta och kapphängning/skoförvaring — utan att gångstråket blockeras.
- **Källa:** SS 91 42 21, best practice
- **Åtgärd:** Komplettera hallen med {saknad funktion} utan att inkräkta på passagen.

### ACC-11 — Fönster ska kunna öppnas och nås
- **Kategori:** Tillgänglighet · **Rum:** Alla · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Varje öppningsbart fönster kan nås och vädras utan att möbler behöver flyttas; djupa möbler (> 60 cm) står inte dikt an mot fönsterbågen.
- **Källa:** BBR 6:253 (vädring), best practice
- **Åtgärd:** Flytta {möbel} så att fönstret i {rum} kan öppnas.

### ACC-12 — Eluttag och strömbrytare åtkomliga
- **Kategori:** Tillgänglighet · **Rum:** Alla · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Strömbrytare vid dörrar är inte skymda av möbler; minst ett eluttag per funktionsyta (säng, soffa, arbetsplats) är åtkomligt utan att flytta möbler.
- **Källa:** SS 437 01 02, best practice
- **Åtgärd:** Flytta {möbel} som blockerar {uttag/brytare}.

### ACC-13 — Rummet får inte övermöbleras
- **Kategori:** Tillgänglighet · **Rum:** Alla · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Fri golvyta (ej täckt av möbler) ≥ 40 % av rummets area; i sovrum och vardagsrum gärna ≥ 50 %.
- **Källa:** Best practice, harmonierar med feng shui (fritt chi-flöde)
- **Åtgärd:** Rummet har {uppmätt} % fri golvyta — ta bort eller förminska {förslag på möbler}.

### ACC-14 — Varje funktion har sin minimiyta
- **Kategori:** Tillgänglighet · **Rum:** Alla · **Viktighet:** 4 · **Mätbarhet:** A
- **Villkor:** Rummets deklarerade funktioner ryms med sina standardmått: sovplats (säng + åtkomst), matplats (bord + stolsutrymme), sittgrupp (soffa + bord + passage), arbetsplats (bord ≥ 100 × 60 cm + stol). En funktion får inte "lånas ut" till en annan så att båda blir obrukbara.
- **Källa:** SS 91 42 21
- **Åtgärd:** {Funktion} ryms inte fullt ut i {rum} — flytta den till {annat rum} eller banta {annan funktion}.

---

# Nivå 3 — Ergonomi, mått och placering

## Vardagsrum

### ERG-01 — Avstånd soffa–soffbord
- **Kategori:** Ergonomi & mått · **Rum:** Vardagsrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** 30–45 cm mellan soffans framkant och soffbordet — nära nog att nå, långt nog för benen.
- **Källa:** Best practice (NKBA, branschpraxis)
- **Åtgärd:** Justera soffbordet till 30–45 cm från soffan (nu {uppmätt} cm).

### ERG-02 — TV-avstånd och TV-höjd
- **Kategori:** Ergonomi & mått · **Rum:** Vardagsrum, sovrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Betraktningsavstånd 1,2–1,6 × skärmdiagonalen för 4K (ca 2,5 × för HD); skärmens mittpunkt i sittande ögonhöjd, ca 90–110 cm över golv; betraktningsvinkel från huvudsittplats ≤ 30° från skärmens normal.
- **Källa:** SMPTE/THX riktlinjer, ergonomisk praxis
- **Åtgärd:** Med {tum}-TV bör sittplatsen vara {intervall} m från skärmen (nu {uppmätt} m).

### ERG-03 — Samtalsvänlig sittgrupp
- **Kategori:** Ergonomi & mått · **Rum:** Vardagsrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Sittplatser i en samtalsgrupp inom 2,5–3,5 m från varandra och orienterade mot ett gemensamt centrum; ingen sittplats helt vänd bort från gruppen.
- **Källa:** Best practice (interior design-praxis)
- **Åtgärd:** Vinkla {fåtölj/soffa} mot gruppens mitt och håll avstånden under 3,5 m.

### ERG-04 — Avställningsyta vid varje sittplats
- **Kategori:** Ergonomi & mått · **Rum:** Vardagsrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Varje sittplats har en avställningsyta (soffbord, sidobord) inom 45 cm räckhåll, i ungefärlig armstödshöjd (45–60 cm).
- **Källa:** Best practice
- **Åtgärd:** Ställ ett sidobord vid {sittplats}.

### ERG-05 — Soffans placering i rummet
- **Kategori:** Ergonomi & mått · **Rum:** Vardagsrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Soffan har ryggen mot vägg eller markerar rumsavdelning med fri passage bakom (≥ 60 cm); den flyter inte omotiverat mitt i rummet. (Förstärks av FEN-13.)
- **Källa:** Best practice; Feng shui
- **Åtgärd:** Ställ soffan mot {vägg} eller ge den en tydlig ryggmarkering (t.ex. avlastningsbord).

## Matplats

### ERG-06 — Bords- och stolshöjd i samspel
- **Kategori:** Ergonomi & mått · **Rum:** Matplats, kök · **Viktighet:** 3 · **Mätbarhet:** D
- **Villkor:** Bordshöjd 72–75 cm med sitthöjd 45 cm (differens 27–30 cm); barstol: differens 25–30 cm mot bardisk.
- **Källa:** SS-EN 1729, möbelbranschstandard
- **Åtgärd:** Byt till stolar med sitthöjd ca {bordshöjd − 29} cm.

### ERG-07 — Pendellampa över bord
- **Kategori:** Ergonomi & mått · **Rum:** Matplats, kök · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Pendel hänger 55–65 cm över bordsskivan (75–90 cm över köksö) och är centrerad över bordet; skärmens bredd ≤ bordets bredd − 30 cm.
- **Källa:** Belysningsbranschens praxis (Ljuskultur)
- **Åtgärd:** Justera pendeln till {mål} cm över bordet och centrera den.

## Sovrum

### ERG-08 — Huvudgärd mot stabil vägg
- **Kategori:** Ergonomi & mått · **Rum:** Sovrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Sängens huvudgärd står mot en vägg (inte fritt i rummet, inte mot fönster). (Sammanfaller med FEN-03.)
- **Källa:** Best practice; Feng shui
- **Åtgärd:** Vänd sängen så att huvudgärden får väggstöd vid {vägg}.

### ERG-09 — Nattduksbord i sänghöjd
- **Kategori:** Ergonomi & mått · **Rum:** Sovrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Nattduksbord vid varje använd sängsida, med skiva inom ±5 cm från madrassens överkant.
- **Källa:** Best practice
- **Åtgärd:** Komplettera {sida} med nattduksbord i höjd ca {madrasshöjd} cm.

## Kök

### ERG-10 — Arbetstriangeln
- **Kategori:** Ergonomi & mått · **Rum:** Kök · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Summan av avstånden spis–diskho–kyl är 4,0–8,0 m; inget ben < 1,2 m eller > 2,7 m; triangeln korsas inte av ett genomgående gångstråk och bryts inte av hög skåpsinredning.
- **Källa:** NKBA, kökbranschens praxis
- **Åtgärd:** Triangeln är {uppmätt} m — flytta {enhet} för att komma inom 4–8 m.

### ERG-11 — Avställningsytor vid spis och kyl
- **Kategori:** Ergonomi & mått · **Rum:** Kök · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** ≥ 40 cm bänkyta på båda sidor om hällen och ≥ 40 cm intill kylens öppningssida; ≥ 80 cm sammanhängande beredningsyta mellan häll och ho.
- **Källa:** SS 91 42 21, NKBA
- **Åtgärd:** Frigör bänkyta vid {enhet}.

### ERG-12 — Bänkhöjd efter användaren
- **Kategori:** Ergonomi & mått · **Rum:** Kök · **Viktighet:** 3 · **Mätbarhet:** M
- **Villkor:** Bänkhöjd = användarens armbågshöjd − 10 till 15 cm (standard 88–92 cm passar längd 170–185 cm).
- **Källa:** Ergonomisk praxis, SS 91 42 21
- **Åtgärd:** Överväg bänkhöjd {rekommendation} cm utifrån användarens längd.

## Arbetsplats

### ERG-13 — Skrivbordets mått och skärmavstånd
- **Kategori:** Ergonomi & mått · **Rum:** Hemmakontor, sovrum, vardagsrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Skrivbord ≥ 100 × 60 cm (skärmarbete: djup ≥ 80 cm eller skärmarm); skärm 50–75 cm från ögonen med överkant i ögonhöjd; bordshöjd 68–74 cm eller justerbar.
- **Källa:** AFS 2020:1 (Arbetsmiljöverket), SS-EN 527
- **Åtgärd:** Öka bordsdjupet eller montera skärmarm så att skärmen hamnar 50–75 cm bort.

### ERG-14 — Arbetsplatsen vinkelrätt mot fönster
- **Kategori:** Ergonomi & mått · **Rum:** Hemmakontor · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Skrivbordet står med sidan mot fönstret — inte med skärmen framför fönstret (motljus) eller med fönstret rakt bakom ryggen (reflexer).
- **Källa:** AFS 2020:1, belysningspraxis
- **Åtgärd:** Vrid skrivbordet 90° så att dagsljuset faller in från sidan.

## Feng shui — placering (kärnregler)

### FEN-01 — Sängen i kommandoposition
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Från sängen ser man rummets dörr utan att ligga i rak linje med den; sängen står diagonalt från dörren med fri sikt mot ingången.
- **Källa:** Feng shui (formskolan)
- **Åtgärd:** Flytta sängen till väggen diagonalt från dörren så att dörren syns från liggande position.

### FEN-02 — Undvik kistpositionen
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Sängens fotände pekar inte rakt mot dörren.
- **Källa:** Feng shui
- **Åtgärd:** Vrid eller förskjut sängen så att fotänden inte ligger i linje med dörren.

### FEN-03 — Säng inte under fönster
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Huvudgärden står inte under eller framför ett fönster; om det är oundvikligt kompenseras med hög huvudgärd och tjocka gardiner.
- **Källa:** Feng shui; sammanfaller med ERG-08
- **Åtgärd:** Flytta sängen till en hel vägg; alternativt hög huvudgärd + mörkläggningsgardin.

### FEN-04 — Säng inte i dörr–fönster-linjen
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Sängen ligger inte i den raka linjen mellan dörr och fönster (drag av chi rakt över sängen).
- **Källa:** Feng shui
- **Åtgärd:** Förskjut sängen ur linjen dörr–fönster.

### FEN-05 — Ingen spegel mot sängen
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Ingen spegel (inkl. spegelgarderob, TV-skärm räknas mildare) reflekterar sängen från liggande position.
- **Källa:** Feng shui
- **Åtgärd:** Flytta/vinkla spegeln, eller täck spegelgarderoben med draperi/film.

### FEN-06 — Inget tungt över sängen
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Inga hyllor, tunga tavlor, takbjälkar eller djupa snedtak direkt över sängen; taklampa hänger inte rakt över kroppen.
- **Källa:** Feng shui; sammanfaller med SAF-10
- **Åtgärd:** Flytta sängen eller {objekt}; under bjälke/snedtak: baldakin eller himmel som mjukar av.

### FEN-07 — Skrivbord i kommandoposition
- **Kategori:** Feng shui · **Rum:** Hemmakontor · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Den som sitter vid skrivbordet ser dörren och har inte ryggen mot den; ryggen har stöd av vägg. Om omöjligt: spegel som visar dörren.
- **Källa:** Feng shui
- **Åtgärd:** Vrid skrivbordet så att dörren är synlig snett framför; sätt annars en liten spegel vid skärmen.

### FEN-08 — Kocken ser dörren
- **Kategori:** Feng shui · **Rum:** Kök · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Den som står vid spisen har uppsikt mot köksentrén; annars kompenseras med reflekterande yta (spegel, blank stänkskiva) bakom hällen.
- **Källa:** Feng shui
- **Åtgärd:** Montera en reflekterande stänkskiva bakom hällen så att entrén syns.

### FEN-09 — Eld och vatten i konflikt
- **Kategori:** Feng shui · **Rum:** Kök · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Spis (eld) står inte dikt an mot eller rakt mitt emot diskho/kyl/diskmaskin (vatten); minst 30–40 cm bänk (träelement) buffrar däremellan.
- **Källa:** Feng shui (femelementläran)
- **Åtgärd:** Låt en bänksektion skilja hällen från {vattenenhet}.

### FEN-10 — Spegel inte rakt mot entrédörren
- **Kategori:** Feng shui · **Rum:** Hall · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Ingen spegel hänger rakt framför ytterdörren (skickar tillbaka inkommande chi); spegel på sidovägg i hallen är däremot bra.
- **Källa:** Feng shui
- **Åtgärd:** Flytta spegeln till en vägg vinkelrät mot entrédörren.

### FEN-11 — Fri och välkomnande entré
- **Kategori:** Feng shui · **Rum:** Hall · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Entrédörren kan öppnas minst 90° utan att slå i något; fri yta innanför dörren; entrén är belyst och inte belamrad (skor/ytterkläder har förvaring).
- **Källa:** Feng shui; sammanfaller med SAF-02/ACC-10
- **Åtgärd:** Rensa ytan innanför dörren och ordna förvaring för {objekt}.

### FEN-12 — Ingen pilrak chi-korridor
- **Kategori:** Feng shui · **Rum:** Alla · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Entrédörren ligger inte i rak, obruten siktlinje med ett stort fönster eller balkongdörr (chi rusar igenom). Om linjen finns: bryt den med matta, möbel, växt eller taklampa längs vägen.
- **Källa:** Feng shui
- **Åtgärd:** Placera {rundad möbel/växt/matta} i linjen mellan dörr och fönster.

### FEN-13 — Soffa med ryggstöd i rummet
- **Kategori:** Feng shui · **Rum:** Vardagsrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Soffan har ryggen mot vägg och sikt mot rummets ingång; ingen huvudsittplats har ryggen rakt mot dörren.
- **Källa:** Feng shui (kommandoposition); sammanfaller med ERG-05
- **Åtgärd:** Ställ soffan mot {vägg} med fri sikt mot dörren.

### FEN-14 — Skarpa hörn pekar inte mot vilplatser
- **Kategori:** Feng shui · **Rum:** Sovrum, vardagsrum · **Viktighet:** 3 · **Mätbarhet:** A
- **Villkor:** Vassa möbelhörn och utstickande vägghörn ("giftpilar") pekar inte rakt mot säng eller huvudsittplats på nära håll (< 1 m); rundade former föredras nära vilplatser.
- **Källa:** Feng shui (sha chi)
- **Åtgärd:** Vinkla {möbel}, välj rundat alternativ eller mjuka upp hörnet med en växt.

---

# Nivå 2 — Ljus, färg, akustik, ordning och energi

## Ljus

### LGT-01 — Tre ljusskikt per rum
- **Kategori:** Ljus · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Varje rum har (1) allmänljus, (2) funktions-/arbetsljus vid varje aktivitetsyta och (3) stämningsljus. Tumregel: 5–7 ljuspunkter i vardagsrum, minst 3 i övriga rum.
- **Källa:** Ljuskultur, belysningsbranschens praxis
- **Åtgärd:** Rummet saknar {skikt} — komplettera med {förslag}.

### LGT-02 — Belysningsstyrka per funktion
- **Kategori:** Ljus · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Riktvärden: köksbänk 500 lux, läs-/arbetsplats 300–500 lux, badrumsspegel 300–500 lux (jämnt från sidorna), allmänljus 100–200 lux, orienteringsljus natt 5–20 lux.
- **Källa:** SS-EN 12464-1 (anpassad till bostad), Ljuskultur
- **Åtgärd:** Förstärk ljuset vid {yta} till ca {mål} lux.

### LGT-03 — Enhetlig och varm färgtemperatur
- **Kategori:** Ljus · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** 2700–3000 K i umgänges- och vilorum, 3000–4000 K vid arbetsytor; blanda inte färgtemperaturer i samma synfält; CRI ≥ 80 (≥ 90 vid spegel och garderob).
- **Källa:** Ljuskultur, best practice
- **Åtgärd:** Byt {ljuskälla} till {mål} K för enhetligt ljus.

### LGT-04 — Bländfrihet
- **Kategori:** Ljus · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Inga oavskärmade ljuskällor i ögonhöjd (sittande 100–130 cm, stående 150–170 cm); pendlar över bord skärmar glödkällan; arbetsljus faller från sidan, inte bakifrån (skuggor) eller framifrån (reflexer).
- **Källa:** SS-EN 12464-1, Ljuskultur
- **Åtgärd:** Skärma av eller höj/sänk {armatur}.

### LGT-05 — Ta vara på dagsljuset
- **Kategori:** Ljus · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** A
- **Villkor:** Höga möbler (> 120 cm) står inte framför fönster; läs- och arbetsplatser ligger inom 2 m från fönster; ljusa ytor/speglar på väggen mittemot fönster hjälper mörka rum.
- **Källa:** BBR 6:322 (dagsljus), best practice
- **Åtgärd:** Flytta {hög möbel} från fönstret; placera {funktion} närmare dagsljuset.

### LGT-06 — Skärmar fria från reflexer
- **Kategori:** Ljus · **Rum:** Vardagsrum, hemmakontor · **Viktighet:** 2 · **Mätbarhet:** A
- **Villkor:** TV och datorskärm står inte mitt emot fönster eller oavskärmad armatur.
- **Källa:** AFS 2020:1, best practice
- **Åtgärd:** Vinkla skärmen eller komplettera med gardin som tar bort reflexen.

### LGT-07 — Dimbart allmänljus
- **Kategori:** Ljus · **Rum:** Vardagsrum, sovrum, matplats · **Viktighet:** 2 · **Mätbarhet:** M
- **Villkor:** Allmän- och stämningsljus i umgängesrum är dimbart så att ljusnivån kan följa dygnet.
- **Källa:** Best practice, Ljuskultur
- **Åtgärd:** Sätt dimmer på {armatur}.

## Färg och textil

### COL-01 — 60-30-10-regeln
- **Kategori:** Färg & textil · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Färgfördelning ungefär 60 % basfärg (väggar, stora ytor), 30 % sekundärfärg (större möbler, textilier), 10 % accentfärg (kuddar, konst, detaljer).
- **Källa:** Best practice (klassisk designlära)
- **Åtgärd:** Rummet domineras av {n} jämnstarka färger — låt {färg} bära 60 % och reducera {färg} till accent.

### COL-02 — Begränsad palett
- **Kategori:** Färg & textil · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Max 3–4 kulörer utöver neutraler per rum; angränsande rum delar minst en gemensam kulör eller ton för helhet.
- **Källa:** Best practice
- **Åtgärd:** Plocka bort eller byt ut objekt i {avvikande kulör}.

### COL-03 — Kulör efter väderstreck
- **Kategori:** Färg & textil · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Rum mot norr (kallt ljus) får varma toner; rum mot söder tål kallare/mättade kulörer; mörka kulörer kräver god ljussättning (se LGT-01).
- **Källa:** Best practice (färglära, NCS-praxis)
- **Åtgärd:** Rummet vetter mot {väderstreck} — överväg {varmare/kallare} nyans.

### COL-04 — Vertikal ljusgradient
- **Kategori:** Färg & textil · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Tak ljusare än väggar, väggar ljusare än golv (upplevs stabilt och högre i tak). Medvetna avsteg (mörkt tak i stora rum) är ok men ska vara just medvetna.
- **Källa:** Best practice (rumsperception)
- **Åtgärd:** Ljusare takkulör lyfter rumshöjden i {rum}.

### COL-05 — Mattans storlek i sittgruppen
- **Kategori:** Färg & textil · **Rum:** Vardagsrum · **Viktighet:** 2 · **Mätbarhet:** A
- **Villkor:** Mattan är stor nog att minst alla frambens möbler i sittgruppen står på den (idealt hela möblerna + 15–20 cm marginal); den flyter inte som ett frimärke mitt i gruppen.
- **Källa:** Best practice
- **Åtgärd:** Byt till matta ca {rekommenderad storlek} så att {möbler} står på den.

### COL-06 — Mattan under matbordet
- **Kategori:** Färg & textil · **Rum:** Matplats · **Viktighet:** 2 · **Mätbarhet:** A
- **Villkor:** Matta under matbord sticker ut ≥ 60–70 cm runt hela bordet så att stolarna står kvar på mattan även utdragna.
- **Källa:** Best practice
- **Åtgärd:** Mattan behöver vara minst {bordsmått + 130} cm.

### COL-07 — Gardinuppsättning
- **Kategori:** Färg & textil · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** A
- **Villkor:** Gardinstång/-skena sitter 10–15 cm över fönsterkarmen eller taknära; stången går 15–25 cm utanför karmen per sida; gardinbredd 1,5–2 × fönstrets bredd; längd till golv (0–1 cm ovan) — inte svävande vid karmens underkant.
- **Källa:** Best practice
- **Åtgärd:** Höj skenan till {mål} och välj golvlång gardin.

## Akustik och luft

### ACO-01 — Dämpa hårda rum
- **Kategori:** Akustik & luft · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Rum med hårda ytor (parkett/klinker + stora glas) har minst två av tre dämpare: stor matta, tyngre gardiner, stoppade möbler. Stora kala väggytor mittemot varandra bryts av med bokhylla, textil eller akustikpanel.
- **Källa:** Best practice (efterklangstid, SS-EN ISO 3382 som referens)
- **Åtgärd:** Lägg till {matta/gardin/textilmöbel} i {rum} för att korta efterklangen.

### ACO-02 — Sovrummet mörkt och tyst
- **Kategori:** Akustik & luft · **Rum:** Sovrum · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Sovrum har mörkläggande gardiner/persienner och textilier som dämpar; säng står inte dikt an mot vägg som delas med hiss, kök eller badrum om alternativ finns.
- **Källa:** Best practice (sömnhygien), BBR 7 (ljudmiljö)
- **Åtgärd:** Komplettera med mörkläggning; prova sängen mot {tystare vägg}.

### ACO-03 — Växter för luft och trivsel
- **Kategori:** Akustik & luft · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Minst en levande växt per rum (vardagsrum gärna 2–3 i olika höjd); välmående, inte vissnande.
- **Källa:** Best practice; feng shui (träelementet)
- **Åtgärd:** Ställ en {ljuslägesanpassad} växt i {rum}.

## Feng shui — energi och ordning

### FEN-15 — Fritt från clutter
- **Kategori:** Feng shui · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** M
- **Villkor:** Fria golv- och bordsytor dominerar; öppna förvaringsytor är inte överfulla; inget staplas ovanpå garderober och skåp; högar av papper/kläder saknas.
- **Källa:** Feng shui; sammanfaller med best practice
- **Åtgärd:** Rensa {yta} och ge {objekt} stängd förvaring.

### FEN-16 — Inget trasigt, inget dött
- **Kategori:** Feng shui · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** M
- **Villkor:** Trasiga klockor, spruckna speglar, trasig belysning och döda växter lagas eller tas bort; alla lampor har fungerande ljuskällor.
- **Källa:** Feng shui
- **Åtgärd:** Laga eller avlägsna {objekt}.

### FEN-17 — De fem elementen i balans
- **Kategori:** Feng shui · **Rum:** Alla · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Varje rum innehåller minst 3 av 5 element och domineras inte helt av ett: trä (växter, trämöbler, grönt), eld (ljus, rött/orange, trianglar), jord (keramik, beige/terrakotta, kvadrater), metall (metalldetaljer, vitt/grått, cirklar), vatten (glas, speglar, blått/svart, vågformer).
- **Källa:** Feng shui (femelementläran)
- **Åtgärd:** Rummet domineras av {element} — tillför {saknat element} via {exempel}.

### FEN-18 — Mjuka växter, inte taggiga
- **Kategori:** Feng shui · **Rum:** Sovrum, vardagsrum · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Växter med mjuka, rundade blad föredras i vilo- och relationsytor; kaktusar och taggiga växter placeras inte i sovrum eller nära sittgrupper.
- **Källa:** Feng shui
- **Åtgärd:** Flytta {taggig växt} till arbetsyta/fönster mot norr; ersätt med t.ex. pilea eller calathea.

### FEN-19 — Inget vattenelement i sovrummet
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** Akvarium, fontäner och stora vattenmotiv i konst hör inte hemma i sovrum (oro/rastlöshet enligt traditionen).
- **Källa:** Feng shui
- **Åtgärd:** Flytta {vattenobjekt} till vardagsrum eller hall.

### FEN-20 — Parsymmetri i sovrummet
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 2 · **Mätbarhet:** A
- **Villkor:** Sängens båda sidor är likvärdigt möblerade: två nattduksbord, två lampor (relationssymbolik och praktisk balans).
- **Källa:** Feng shui; sammanfaller med ERG-09
- **Åtgärd:** Komplettera {sida} med nattduksbord och lampa.

### FEN-21 — Rent under sängen
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 2 · **Mätbarhet:** M
- **Villkor:** Utrymmet under sängen är tomt, eller innehåller endast mjuka sovrelaterade textilier (sängkläder); ingen förvaring av skor, papper, träningsutrustning.
- **Källa:** Feng shui
- **Åtgärd:** Töm under sängen; flytta {objekt} till garderob/förråd.

### FEN-22 — Minimalt med elektronik i sovrummet
- **Kategori:** Feng shui · **Rum:** Sovrum · **Viktighet:** 2 · **Mätbarhet:** D
- **Villkor:** TV, dator och träningsutrustning undviks i sovrum; om TV finns: skåp med lucka eller textil som täcker skärmen nattetid.
- **Källa:** Feng shui; sammanfaller med sömn-best practice
- **Åtgärd:** Flytta {apparat} eller dölj den i stängd förvaring.

### FEN-23 — Badrummet läcker inte energi
- **Kategori:** Feng shui · **Rum:** Badrum · **Viktighet:** 2 · **Mätbarhet:** M
- **Villkor:** Badrumsdörren hålls stängd och toalettlocket nedfällt (symboliskt: vatten dränerar chi); badrumsdörr rakt mot säng eller matplats skärmas av.
- **Källa:** Feng shui
- **Åtgärd:** Vana-regel: stäng dörr och lock; sätt en skärm/växt mellan badrumsdörren och {säng/bord}.

---

# Nivå 1 — Estetik, styling och harmoni

### AES-01 — Konst i rätt höjd
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** A
- **Villkor:** Tavlans mittpunkt 145–155 cm över golv (ögonhöjd); över möbel: 15–25 cm mellan möbelns överkant och tavlans underkant; i tavelvägg räknas gruppens gemensamma mittpunkt.
- **Källa:** Best practice (gallerihängning)
- **Åtgärd:** Sänk/höj {tavla} till mittpunkt ca 150 cm.

### AES-02 — Konstens bredd följer möbeln
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** A
- **Villkor:** Konst/spegel över soffa, säng eller skänk är ca 2/3 av möbelns bredd (50–75 % accepteras) och centreras över möbeln, inte över väggen.
- **Källa:** Best practice
- **Åtgärd:** Välj bredare verk eller gruppera flera till ca {2/3 × möbelbredd} cm.

### AES-03 — Udda antal och triangelkomposition
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** D
- **Villkor:** Stilleben och grupper styls i udda antal (3 eller 5) med varierade höjder som bildar en triangel; föremål grupperas i stället för att spridas jämnt.
- **Källa:** Best practice (stylinglära)
- **Åtgärd:** Gruppera om {yta} till tre objekt i olika höjd.

### AES-04 — Skala och höjdvariation
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** A
- **Villkor:** Möblernas skala matchar rummet (stora rum tål stora möbler, små rum kräver lågskaligt); rummet blandar minst tre möbelhöjder (lågt/mellan/högt) så att blicken vandrar.
- **Källa:** Best practice (proportionslära)
- **Åtgärd:** Tillför en {hög/låg} komponent, t.ex. {förslag}.

### AES-05 — Visuell balans i rummet
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** A
- **Villkor:** Visuell vikt (stora/mörka möbler) fördelas runt rummet — inte alla tunga volymer längs en vägg medan resten står tomt.
- **Källa:** Best practice
- **Åtgärd:** Balansera {tung sida} med {möbel/bokhylla/mörk textil} på motstående sida.

### AES-06 — En fokuspunkt per rum
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** D
- **Villkor:** Rummet har en tydlig fokuspunkt (eldstad, fönsterutsikt, konstverk, huvudmöbel) som möbleringen orienteras kring; konkurrerande fokuspunkter (TV mitt emot eldstad) hanteras medvetet.
- **Källa:** Best practice
- **Åtgärd:** Orientera sittgruppen mot {fokuspunkt} och tona ned {konkurrent}.

### AES-07 — Rytm och upprepning
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** D
- **Villkor:** Varje accentfärg, form eller material återkommer på minst 2–3 ställen i rummet (en ensam röd kudde är en främling; tre röda inslag är ett tema).
- **Källa:** Best practice
- **Åtgärd:** Upprepa {accent} i ytterligare {n} objekt eller ta bort den.

### AES-08 — Negativt utrymme
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** D
- **Villkor:** Väggar och hyllor har andningsutrymme — lämna ca 20 % av vägg- och hyllytor tomma; varje rum har minst en lugn, obruten yta.
- **Källa:** Best practice; harmonierar med FEN-15
- **Åtgärd:** Gles ur {vägg/hylla}; låt {yta} vila tom.

### AES-09 — Materialmix
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** D
- **Villkor:** Minst tre olika material/texturer per rum (t.ex. trä + textil + metall/sten/glas); inte allt i samma träslag och finish.
- **Källa:** Best practice
- **Åtgärd:** Bryt {dominant material} med {förslag på kontrasterande textur}.

### AES-10 — Samordnade metaller och finishar
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** D
- **Villkor:** Max 2–3 metallfinishar per rum (t.ex. mässing + svart), konsekvent använda; beslag, armaturer och detaljer följer paletten.
- **Källa:** Best practice
- **Åtgärd:** Byt {avvikande finish} till {husets huvudfinish}.

### AES-11 — Belysningsarmaturer i samspel
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** D
- **Villkor:** Armaturer i samma rum delar formspråk eller kulör (behöver inte vara en serie); en statement-armatur räcker per rum.
- **Källa:** Best practice
- **Åtgärd:** Låt {armatur} vara solist och välj diskretare komplement.

### AES-12 — Personligt över opersonligt
- **Kategori:** Estetik · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** M
- **Villkor:** Rummet innehåller personliga föremål (böcker, arv, konst, foton i väl valda ramar) — inte enbart kataloginredning; foton av människor hör enligt feng shui hemma i sällskapsytor snarare än sovrum.
- **Källa:** Best practice; Feng shui
- **Åtgärd:** Lyft in {personligt föremål} i {rum}.

### FEN-24 — Bagua-zoner (kräver orientering)
- **Kategori:** Feng shui · **Rum:** Alla (bostaden som helhet) · **Viktighet:** 1 · **Mätbarhet:** M
- **Villkor:** Bostadens bagua-karta läggs över planritningen (från entrén eller efter kompass). Varje zon stöds av sitt element: rikedom (SÖ, trä/lila), berömmelse (S, eld/rött), relationer (SV, jord/par), familj (Ö, trä), hälsa (mitten, jord/fri yta), barn/kreativitet (V, metall), kunskap (NÖ, jord/böcker), karriär (N, vatten), hjälpare/resor (NV, metall). Särskilt: bostadens mitt hålls öppen och ljus.
- **Källa:** Feng shui (bagua, kompass-/formskolan)
- **Åtgärd:** Aktivera {zon} med {element/färg/objekt}; frigör bostadens mitt.

### FEN-25 — Färg efter väderstreckets element
- **Kategori:** Feng shui · **Rum:** Alla · **Viktighet:** 1 · **Mätbarhet:** M
- **Villkor:** Rummets dominerande kulörer harmonierar med väderstreckets element (N: blått/svart, Ö/SÖ: grönt, S: rött/varma toner, SV/NÖ: jordtoner, V/NV: vitt/metall) — eller bryter medvetet med stödjande element.
- **Källa:** Feng shui (kompasskolan)
- **Åtgärd:** Rummet ligger i {väderstreck} — förstärk med {kulör/element}.

---

# Bilaga — implementationstips för regelmotorn

- **Tillämplighet:** Varje regel prövas bara om dess `Rum` matchar och rummets objekt gör den relevant (ingen TV → ERG-02 utgår). Redovisa "ej tillämplig" separat från "godkänd".
- **Dubbletter/förstärkningar:** Vissa regler överlappar avsiktligt över kategorier (ERG-08/FEN-03, SAF-10/FEN-06, ERG-05/FEN-13, ERG-09/FEN-20, ACC-10/FEN-11). Regelmotorn bör länka dem så att samma geometrifynd inte dubbelbestraffas i totalbetyget, men kan redovisas i respektive kategori.
- **Mätbarhet A** kräver från modellen: rumspolygon med dörrar/fönster (position, bredd, slagriktning), möbler med typ, mått, rotation samt utrymningsvägsmarkering. **D** kräver objektmetadata (material, ljuskälla, färg). **M** löses med en checklista användaren fyller i.
- **Betygsvisning:** ett totalbetyg + delbetyg per kategori (Säkerhet, Tillgänglighet, Ergonomi, Feng shui, Ljus, Färg & textil, Akustik & luft, Estetik), lista över brutna regler sorterad på viktighet, med `Åtgärd`-mallen ifylld med faktiska objekt och mått.
- **Trösklar:** där intervall anges (t.ex. 30–45 cm) kan motorn ge full poäng inom intervallet, halv poäng inom ±20 % och noll utanför — det ger mjukare betyg än binärt pass/fail.
