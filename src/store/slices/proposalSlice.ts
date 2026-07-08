import { nanoid } from 'nanoid';
import type { Proposal } from '../../types';
import { clampFurniture } from '../../lib/collision';
import { floorPolygon } from '../../lib/polygon';
import { syncActiveProposal } from '../../lib/persistence';
import {
  cloneFurniture,
  nextProposalName,
  touch,
  type DesignGet,
  type DesignSet,
  type ProposalActions,
} from '../designModel';

/** Furnishing-proposal actions within the active room. */
export function createProposalSlice(set: DesignSet, get: DesignGet): ProposalActions {
  return {
    addProposal: ({ name, copyCurrent }) => {
      // Snapshot the current furnishing into its proposal before adding a sibling.
      const d = syncActiveProposal(get().design);
      const id = nanoid(8);
      const furniture = copyCurrent ? cloneFurniture(d.furniture) : [];
      // A new variant starts from the current palette; the user tweaks it after.
      const { floorColor, wallColor } = d;
      const proposal: Proposal = {
        id,
        name: name?.trim() || nextProposalName(d.proposals),
        furniture,
        floorColor,
        wallColor,
      };
      set({
        design: touch({
          ...d,
          proposals: [...d.proposals, proposal],
          activeProposalId: id,
          furniture,
          floorColor,
          wallColor,
        }),
      });
      return id;
    },

    addProposalFromFurniture: (name, items, colors) => {
      const d = syncActiveProposal(get().design);
      const poly = floorPolygon(d.walls);
      const furniture = items.map((it) => clampFurniture({ ...it, id: nanoid(8) }, poly));
      const id = nanoid(8);
      const floorColor = colors?.floorColor ?? d.floorColor;
      const wallColor = colors?.wallColor ?? d.wallColor;
      const proposal: Proposal = {
        id,
        name: name.trim() || nextProposalName(d.proposals),
        furniture,
        floorColor,
        wallColor,
      };
      set({
        design: touch({
          ...d,
          proposals: [...d.proposals, proposal],
          activeProposalId: id,
          furniture,
          floorColor,
          wallColor,
        }),
      });
      return id;
    },

    setActiveProposal: (id) => {
      const current = get().design;
      if (id === current.activeProposalId) return;
      // Persist the on-screen furnishing before swapping in the target's.
      const d = syncActiveProposal(current);
      const target = d.proposals.find((p) => p.id === id);
      if (!target) return;
      const poly = floorPolygon(d.walls);
      set({
        design: touch({
          ...d,
          activeProposalId: id,
          furniture: target.furniture.map((f) => clampFurniture(f, poly)),
          floorColor: target.floorColor,
          wallColor: target.wallColor,
        }),
      });
    },

    removeProposal: (id) => {
      const current = get().design;
      if (current.proposals.length <= 1) return; // keep at least one proposal per room
      const d = syncActiveProposal(current);
      const idx = d.proposals.findIndex((p) => p.id === id);
      if (idx === -1) return;
      const proposals = d.proposals.filter((p) => p.id !== id);
      if (id !== d.activeProposalId) {
        set({ design: touch({ ...d, proposals }) });
        return;
      }
      // Removing the active one: fall back to the previous proposal in the list.
      const nextActive = proposals[Math.max(0, idx - 1)];
      const poly = floorPolygon(d.walls);
      set({
        design: touch({
          ...d,
          proposals,
          activeProposalId: nextActive.id,
          furniture: nextActive.furniture.map((f) => clampFurniture(f, poly)),
          floorColor: nextActive.floorColor,
          wallColor: nextActive.wallColor,
        }),
      });
    },
  };
}
