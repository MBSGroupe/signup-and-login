import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RuleEditor from './RuleEditor';
import RuleListEditor from './RuleListEditor';

// The permission rule editor must produce the JSON shape the backend
// evaluates: { grade | role: { name }, condition, conditions?,
// customCondition?, scope? }.

function Harness({ initial, Component = RuleEditor, prop = 'rule', ...props }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Component {...{ [prop]: value }} onChange={setValue} {...props} />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </>
  );
}
const current = () => JSON.parse(screen.getByTestId('json').textContent);
const selects = () => screen.getAllByRole('combobox');

describe('RuleEditor', () => {
  it('switching the target between grade and role keeps exactly one of them', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ grade: 'admin', condition: 'any' }} availableRoles={['sec_cnoa', 'cloa_admin']} />);
    await user.selectOptions(selects()[0], 'role');
    expect(current()).toEqual({ role: { name: 'admin' }, condition: 'any' });
    await user.selectOptions(selects()[1], 'sec_cnoa');
    expect(current()).toEqual({ role: { name: 'sec_cnoa' }, condition: 'any' });
    await user.selectOptions(selects()[0], 'grade');
    expect(current()).toEqual({ grade: 'sec_cnoa', condition: 'any' });
    await user.selectOptions(selects()[1], 'super_admin');
    expect(current()).toEqual({ grade: 'super_admin', condition: 'any' });
  });

  it('without a role list the role is typed', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ role: { name: '' }, condition: 'any' }} />);
    await user.type(screen.getByPlaceholderText('nom du rôle'), 'tresorier');
    expect(current().role).toEqual({ name: 'tresorier' });
  });

  it('a composite condition gets a first sub-condition; sub-conditions can be changed, added and removed', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ grade: 'admin', condition: 'any' }} />);
    await user.selectOptions(selects()[2], 'and');
    expect(current()).toMatchObject({ condition: 'and', conditions: [{ condition: 'any' }] });

    await user.selectOptions(selects()[3], 'same_region');
    await user.click(screen.getByRole('button', { name: /ajouter une sous-condition/i }));
    await user.selectOptions(selects()[4], 'self');
    expect(current().conditions).toEqual([{ condition: 'same_region' }, { condition: 'self' }]);

    await user.click(screen.getAllByTitle('Supprimer')[0]);
    expect(current().conditions).toEqual([{ condition: 'self' }]);

    await user.selectOptions(selects()[2], 'self');
    expect(current()).toMatchObject({ condition: 'self' });
    expect(current().conditions).toBeUndefined();
  });

  it('custom conditions carry their name', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ grade: 'admin', condition: 'any' }} />);
    await user.selectOptions(selects()[2], 'custom');
    await user.type(screen.getByPlaceholderText('nom de la condition'), 'is_same_wilaya');
    expect(current()).toMatchObject({ condition: 'custom', customCondition: 'is_same_wilaya' });
  });

  it('scopes: create, list values (regression: commas can be typed), composite with children, remove', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ grade: 'admin', condition: 'any' }} />);
    await user.click(screen.getByRole('button', { name: /ajouter une restriction de lignes/i }));
    await user.click(screen.getByRole('button', { name: /créer un scope/i }));
    expect(current().scope).toEqual({ type: 'same_region', field: 'region' });

    const scopeSelect = () => selects()[3];
    await user.selectOptions(scopeSelect(), 'field_in');
    await user.type(screen.getByPlaceholderText('champ'), 'status');
    await user.type(screen.getByPlaceholderText('v1, v2'), 'active, pending,');
    expect(current().scope).toEqual({ type: 'field_in', field: 'status', value: ['active', 'pending'] });

    await user.selectOptions(scopeSelect(), 'or');
    expect(current().scope).toEqual({ type: 'or', scopes: [{ type: 'same_region' }] });
    await user.click(screen.getByRole('button', { name: /ajouter un scope/i }));
    expect(current().scope.scopes).toHaveLength(2);

    await user.click(screen.getAllByTitle('Supprimer')[0]);
    expect(current()).not.toHaveProperty('scope');
  });
});

describe('RuleListEditor', () => {
  it('shows an empty state, adds, edits and removes rules', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[]} Component={RuleListEditor} prop="rules" addLabel="Ajouter" />);
    expect(screen.getByText(/Aucune règle/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(current()).toHaveLength(2);

    await user.selectOptions(selects()[1], 'admin');
    expect(current()[0]).toMatchObject({ grade: 'admin' });

    await user.click(screen.getAllByTitle('Supprimer la règle')[0]);
    expect(current()).toHaveLength(1);
  });

  it('regression: a new rule grants nothing new (super_admin, not every member)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RuleListEditor rules={[]} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /ajouter une règle/i }));
    expect(onChange).toHaveBeenCalledWith([{ grade: 'super_admin', condition: 'any' }]);
    expect(within(document.body).queryByText('user')).toBeNull();
  });
});
