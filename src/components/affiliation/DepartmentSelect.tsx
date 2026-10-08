import type { JSX } from 'react';
import { MUNICIPALITY_FIELD_COPY } from '../../copy/affiliation';
import type { DepartmentOption } from '../../lib/municipality-catalog';
import type { FieldControlProps } from '../ui/Field';

export interface DepartmentSelectProps {
  control: FieldControlProps;
  departments: readonly DepartmentOption[];
  value: string;
  onChange: (code: string) => void;
  onBlur: () => void;
  disabled?: boolean;
}

export function DepartmentSelect({
  control,
  departments,
  value,
  onChange,
  onBlur,
  disabled = false,
}: DepartmentSelectProps): JSX.Element {
  return (
    <select
      {...control}
      value={value}
      disabled={disabled}
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      className="vy-input"
    >
      <option value="">{MUNICIPALITY_FIELD_COPY.departmentPlaceholder}</option>
      {departments.map((department) => (
        <option key={department.code} value={department.code}>
          {department.name}
        </option>
      ))}
    </select>
  );
}
