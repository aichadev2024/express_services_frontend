"use client";

import { useId, type CSSProperties, type ChangeEvent } from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  name?: string;
}

/**
 * Extracts 8-digit local number by stripping +223 prefix if present
 */
function getLocalDigits(val: string): string {
  if (!val) return '';
  let cleaned = val.replace(/\s+/g, '');
  if (cleaned.startsWith('+223')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('223')) {
    cleaned = cleaned.substring(3);
  }
  return cleaned.replace(/\D/g, '').slice(0, 8);
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = '70 00 00 00',
  required = false,
  disabled = false,
  className = '',
  style,
  id,
  name
}: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const localValue = getLocalDigits(value);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (!raw) {
      onChange('');
    } else {
      onChange(`+223 ${raw}`);
    }
  };

  return (
    <div
      className={`phone-input-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        ...style
      }}
    >
      <div
        className="phone-prefix-badge"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 12px',
          height: '42px',
          background: 'rgba(241, 245, 249, 0.95)',
          border: '1px solid #cbd5e1',
          borderRight: 'none',
          borderRadius: '12px 0 0 12px',
          fontSize: '13.5px',
          fontWeight: 700,
          color: '#1e293b',
          userSelect: 'none',
          flexShrink: 0,
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ fontSize: '16px' }}>🇲🇱</span>
        <span>+223</span>
      </div>

      <input
        id={inputId}
        name={name}
        type="tel"
        value={localValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={8}
        style={{
          flex: 1,
          borderRadius: '0 12px 12px 0',
          height: '42px',
          borderLeft: 'none'
        }}
      />
    </div>
  );
}
