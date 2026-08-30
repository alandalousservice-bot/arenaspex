import React from 'react';
import { formatAcademicYearLabel } from '../../services/academicYear';

interface AcademicYearLabelProps {
  value: string;
  className?: string;
}

/** Presentation-only numeric isolation for academic years inside RTL copy. */
export const AcademicYearLabel: React.FC<AcademicYearLabelProps> = ({ value, className }) => (
  <span dir="ltr" className={className} style={{ unicodeBidi: 'isolate' }}>
    {formatAcademicYearLabel(value)}
  </span>
);
