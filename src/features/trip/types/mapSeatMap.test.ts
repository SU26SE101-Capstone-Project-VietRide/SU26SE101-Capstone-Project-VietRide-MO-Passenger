import {
  mapSeatMap,
  normalizeSeatMapAisles,
  resolveAisleAfterColumns,
  type SeatDto,
} from './trip';

const seats = (items: Array<Partial<SeatDto> & Pick<SeatDto, 'seatNumber' | 'row' | 'col'>>): SeatDto[] =>
  items.map(item => ({
    status: 'AVAILABLE',
    deck: 1,
    ...item,
  }));

describe('normalizeSeatMapAisles', () => {
  it('returns null when aisles are missing or empty', () => {
    expect(normalizeSeatMapAisles(null)).toBeNull();
    expect(normalizeSeatMapAisles([])).toBeNull();
    expect(normalizeSeatMapAisles([{ afterCol: 0 }])).toBeNull();
  });

  it('accepts BE afterCol objects and bare numbers', () => {
    expect(normalizeSeatMapAisles([{ afterCol: 2 }, { afterCol: 1 }, 2])).toEqual([
      1,
      2,
    ]);
  });
});

describe('resolveAisleAfterColumns', () => {
  it('prefers valid BE aisles over the heuristic', () => {
    expect(resolveAisleAfterColumns([1, 2, 3, 4], [1])).toEqual([1]);
    expect(resolveAisleAfterColumns([1, 2, 3, 4], null)).toEqual([2]);
  });

  it('falls back when BE aisles do not split occupied columns', () => {
    expect(resolveAisleAfterColumns([1, 2], [9])).toEqual([1]);
  });
});

describe('mapSeatMap', () => {
  it('keeps seat rows and surfaces BE aisles without inventing them', () => {
    const layout = mapSeatMap(
      seats([
        { seatNumber: 'A1', row: 1, col: 1 },
        { seatNumber: 'A2', row: 1, col: 2 },
        { seatNumber: 'A3', row: 1, col: 3 },
        { seatNumber: 'A4', row: 1, col: 4 },
      ]),
      [{ afterCol: 1 }],
    );

    expect(layout.aisleAfterCols).toEqual([1]);
    expect(layout.rows).toHaveLength(1);
    expect(layout.rows[0].leftSeats.map(seat => seat.id)).toEqual(['A1']);
    expect(layout.rows[0].rightSeats.map(seat => seat.id)).toEqual([
      'A2',
      'A3',
      'A4',
    ]);
  });

  it('uses null aisles when BE omits them (heuristic stays in the UI resolver)', () => {
    const layout = mapSeatMap(
      seats([
        { seatNumber: 'A1', row: 1, col: 1 },
        { seatNumber: 'A2', row: 1, col: 2 },
        { seatNumber: 'A3', row: 1, col: 3 },
        { seatNumber: 'A4', row: 1, col: 4 },
      ]),
    );

    expect(layout.aisleAfterCols).toBeNull();
    expect(layout.rows[0].leftSeats).toHaveLength(2);
    expect(layout.rows[0].rightSeats).toHaveLength(2);
  });
});
