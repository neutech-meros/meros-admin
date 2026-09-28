import { getBusinessAccountRequests } from '../businessAccounts';

describe('getBusinessAccountRequests', () => {
  it('returns exactly 6 rows with unique ids', () => {
    const rows = getBusinessAccountRequests();
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((r) => r.id)).size).toBe(6);
  });

  it('seeds the literal mockup values in order', () => {
    const rows = getBusinessAccountRequests();
    expect(rows.map((r) => r.name)).toEqual([
      'Pousada Vista Azul',
      'Trilhas do Sul Turismo',
      'Sabor da Ilha Restaurante',
      'Rota Norte Transfers',
      'Casa Mar Aluguéis',
      'Serra Bike Experience',
    ]);
    expect(rows[0]).toMatchObject({
      name: 'Pousada Vista Azul',
      city: 'Paraty, RJ',
      cnpj: '12.345.678/0001-90',
      category: 'Accommodation',
      requester: 'Marina Alves',
      email: 'marina@vistaazul.com.br',
      docs: '3 of 3',
      submitted: '24/08/2026',
      status: 'Pending',
      plan: 'Business Pro',
      note: 'Requested to sell hosted stays and list experiences.',
    });
    expect(rows[3]).toMatchObject({
      city: 'Natal, RN',
      cnpj: '33.221.554/0001-77',
      requester: 'Fábio Lima',
      docs: '1 of 3',
      status: 'More info',
      note: 'Tax ID does not match the submitted company name.',
    });
    expect(rows[5]).toMatchObject({
      city: 'Campos do Jordão, SP',
      email: 'thiago@serrabike.com',
      submitted: '18/08/2026',
      note: 'Approved with commission tier 12%.',
    });
    expect(rows.map((r) => r.status)).toEqual([
      'Pending',
      'Pending',
      'Approved',
      'More info',
      'Rejected',
      'Approved',
    ]);
  });

  it('includes at least one row of every status', () => {
    const statuses = getBusinessAccountRequests().map((r) => r.status);
    (['Pending', 'More info', 'Approved', 'Rejected'] as const).forEach((status) => {
      expect(statuses.filter((s) => s === status).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('derives well-formed initials and avatar colors', () => {
    const rows = getBusinessAccountRequests();
    rows.forEach((r) => {
      expect(r.initials).toMatch(/^[A-Z]{1,2}$/);
      expect(r.avatarColor).toMatch(/^#[0-9A-F]{6}$/i);
    });
    expect(rows[0].initials).toBe('PV');
    expect(rows[3].initials).toBe('RN');
  });

  it('returns an equal but fresh copy on every call', () => {
    const first = getBusinessAccountRequests();
    const second = getBusinessAccountRequests();
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second[0]).not.toBe(first[0]);
  });
});
