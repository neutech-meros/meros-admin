import { avatarColorForIndex, initialsOf } from '../avatar';

describe('initialsOf', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initialsOf('Camila Duarte')).toBe('CD');
  });
  it('handles a single-word name', () => {
    expect(initialsOf('Cher')).toBe('C');
  });
});

describe('avatarColorForIndex', () => {
  it('cycles through a fixed palette by index', () => {
    expect(avatarColorForIndex(0)).toBe('#7F00FF');
    expect(avatarColorForIndex(5)).toBe('#7F00FF');
  });
});
