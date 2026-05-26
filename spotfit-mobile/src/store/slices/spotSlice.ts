import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { spotsApi, Spot, GetSpotsParams } from '../../api/spotApi';

interface SpotState {
  spots: Spot[];
  selectedSpot: Spot | null;
  loading: boolean;
  error: string | null;
  filters: {
    sportId: string | null;
    radius: number;
  };
}

const initialState: SpotState = {
  spots: [],
  selectedSpot: null,
  loading: false,
  error: null,
  filters: { sportId: null, radius: 5000 },
};

export const fetchSpots = createAsyncThunk('spots/fetchSpots', async (params: GetSpotsParams) => {
  const res = await spotsApi.getSpots(params);
  return res.data.data;
});

export const fetchSpotById = createAsyncThunk('spots/fetchSpotById', async (id: string) => {
  const res = await spotsApi.getSpotById(id);
  return res.data.data;
});

export const joinSpot = createAsyncThunk('spots/joinSpot', async (id: string) => {
  const res = await spotsApi.joinSpot(id);
  return { id, ...res.data.data };
});

export const leaveSpot = createAsyncThunk('spots/leaveSpot', async (id: string) => {
  await spotsApi.leaveSpot(id);
  return id;
});

const spotSlice = createSlice({
  name: 'spots',
  initialState,
  reducers: {
    setSelectedSpot: (state, action) => { state.selectedSpot = action.payload; },
    clearSelectedSpot: (state) => { state.selectedSpot = null; },
    setFilter: (state, action) => { state.filters = { ...state.filters, ...action.payload }; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpots.pending, (state) => { state.loading = true; })
      .addCase(fetchSpots.fulfilled, (state, action) => { state.loading = false; state.spots = action.payload; })
      .addCase(fetchSpots.rejected, (state, action) => { state.loading = false; state.error = action.error.message || null; })
      .addCase(fetchSpotById.fulfilled, (state, action) => { state.selectedSpot = action.payload; })
      .addCase(joinSpot.fulfilled, (state, action) => {
        const spot = state.spots.find(s => s.id === action.payload.id);
        if (spot) {
          spot.currentParticipants = action.payload.currentParticipants;
          spot.status = action.payload.status;
        }
      });
  },
});

export const { setSelectedSpot, clearSelectedSpot, setFilter } = spotSlice.actions;
export default spotSlice.reducer;
