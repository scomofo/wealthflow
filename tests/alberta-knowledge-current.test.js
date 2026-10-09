const fs = require('fs');
const path = require('path');

const knowledgePath = path.join(__dirname, '..', 'src', 'knowledge', 'alberta_tax_law.txt');
const knowledge = fs.readFileSync(knowledgePath, 'utf8');
const { TFSA_CUMULATIVE_2026, OAS } = require('../src/renderer/js/canadian/constants.js');

describe('Alberta knowledge current-year guardrails', () => {
  test('uses current 2026 Alberta personal-credit figures', () => {
    for (const expected of [
      '$22,769', '$6,345', '$1,753', '$17,563', '$13,180',
      '$47,234', '$89,534', '$20,956', '$34,136', '$8,707', '$21,887',
    ]) {
      expect(knowledge).toContain(expected);
    }
    expect(knowledge).toContain('Alberta tuition and education tax credits were discontinued beginning with the 2020 tax year');
    expect(knowledge).toContain('unused Alberta tuition and education amounts from before 2020');
    expect(knowledge).not.toContain('Tuition Tax Credit: 8% of eligible tuition fees');
  });

  test('uses current July 2026 to June 2027 family-benefit figures', () => {
    for (const expected of [
      '$8,157', '$6,883', '$38,237', '$82,847',
      '$1,529', '$2,293', '$3,057', '$3,821',
      '$782', '$1,494', '$1,920', '$2,061',
      '$28,116', '$47,115',
      'Canada Groceries and Essentials Benefit (CGEB)', '$679', '$890', '$234',
    ]) {
      expect(knowledge).toContain(expected);
    }
    expect(knowledge).toContain('replaced the GST/HST credit in July 2026');
  });

  test('uses current 2026 CPP, EI, OAS and Alberta Seniors Benefit figures', () => {
    for (const expected of [
      '$4,230.45', '$416.00', '$4,646.45',
      '$68,900', '1.63%', '$1,123.07', '$1,572.30',
      '$751.97', '$827.17',
      '$32,690', '$53,800', '$3,946', '$5,918',
    ]) {
      expect(knowledge).toContain(expected);
    }
    expect(knowledge).not.toContain('~$4,640 + $416 = ~$5,056');
    expect(knowledge).not.toContain('$65,700 for 2026');
    expect(knowledge).not.toContain('rate is 1.64%');
  });

  test('identifies Alberta and CRA as the current-law authorities', () => {
    expect(knowledge).toContain('Last Verified: October 2026');
    expect(knowledge).toContain('Canada Revenue Agency (CRA) and Alberta.ca primary sources');
    expect(knowledge).toContain('Canada-only, Alberta-first');
    expect(knowledge).not.toContain('Lowest combined top marginal rate in Canada');
    expect(knowledge).not.toContain('highest in Canada');
    expect(knowledge).toContain("8% first tax bracket applies to the first $61,200");
  });

  test('keeps live 2026 TFSA and OAS constants aligned with current federal figures', () => {
    expect(TFSA_CUMULATIVE_2026).toBe(109000);
    expect(OAS.FULL_CLAWBACK_THRESHOLD).toBe(155109);
    expect(OAS.FULL_CLAWBACK_THRESHOLD_75_PLUS).toBe(161088);
  });
});
