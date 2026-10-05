import { create } from 'zustand';

interface ListsState {
  selectedListId: string | null;
  setSelectedListId: (id: string | null) => void;
}

export const useListsStore = create<ListsState>((set) => ({
  selectedListId: null,
  setSelectedListId: (id) => set({ selectedListId: id }),
}));
