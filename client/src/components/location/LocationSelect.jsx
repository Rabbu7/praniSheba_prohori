import React from 'react';
import useLocations from '../../hooks/useLocations';

const selectClass = 'mt-2 w-full rounded-lg border border-outline-variant bg-surface-white px-4 py-3 text-body-lg text-on-background outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-secondary/60';

export default function LocationSelect({
  division = '',
  district = '',
  onChange,
  disabled = false,
  required = false,
  idPrefix = 'location',
  spacingClass = 'space-y-4',
}) {
  const { locations, loading } = useLocations();

  const divisions = locations ? Object.keys(locations) : [];
  const districts = (locations && division && locations[division]) || [];

  const handleDivisionChange = (event) => {
    const nextDivision = event.target.value;
    onChange({
      division: nextDivision,
      district: '',
    });
  };

  const handleDistrictChange = (event) => {
    const nextDistrict = event.target.value;
    onChange({
      division,
      district: nextDistrict,
    });
  };

  return (
    <div className={spacingClass}>
      <div>
        <label className="text-sm font-semibold text-on-background" htmlFor={`${idPrefix}-division`}>
          Division
        </label>
        <select
          id={`${idPrefix}-division`}
          name="division"
          value={division || ''}
          onChange={handleDivisionChange}
          disabled={disabled || loading}
          className={selectClass}
          required={required}
        >
          <option value="">{loading ? 'Loading divisions...' : 'Select Division'}</option>
          {divisions.map((div) => (
            <option key={div} value={div}>
              {div}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-on-background" htmlFor={`${idPrefix}-district`}>
          District
        </label>
        <select
          id={`${idPrefix}-district`}
          name="district"
          value={district || ''}
          onChange={handleDistrictChange}
          disabled={disabled || !division || districts.length === 0}
          className={selectClass}
          required={required}
        >
          <option value="">{division ? 'Select District' : 'Select a division first'}</option>
          {districts.map((dist) => (
            <option key={dist} value={dist}>
              {dist}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

