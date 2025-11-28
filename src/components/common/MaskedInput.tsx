"use client";

import React, { forwardRef } from "react";
import { IMaskInput } from "react-imask";
import { TextField, TextFieldProps } from "@mui/material";

interface CustomProps {
  onChange: (event: { target: { name: string; value: string } }) => void;
  name: string;
  mask: string;
}

const TextMaskCustom = forwardRef<HTMLInputElement, CustomProps>(
  function TextMaskCustom(props, ref) {
    const { onChange, mask, ...other } = props;
    return (
      <IMaskInput
        {...other}
        mask={mask}
        inputRef={ref}
        onAccept={(value: string) =>
          onChange({ target: { name: props.name, value } })
        }
        overwrite
      />
    );
  }
);

// Phone Input with Pakistan format: 0300-0000000
interface PhoneInputProps extends Omit<TextFieldProps, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

export function PhoneInput({ value, onChange, ...props }: PhoneInputProps) {
  return (
    <TextField
      {...props}
      value={value}
      placeholder="0300-0000000"
      InputProps={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputComponent: TextMaskCustom as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputProps: {
          mask: "0000-0000000",
          name: "phone",
          onChange: (event: { target: { name: string; value: string } }) => {
            onChange(event.target.value);
          },
        } as any,
      }}
    />
  );
}

// CNIC Input with Pakistan format: 00000-0000000-0
interface CNICInputProps extends Omit<TextFieldProps, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

export function CNICInput({ value, onChange, ...props }: CNICInputProps) {
  return (
    <TextField
      {...props}
      value={value}
      placeholder="00000-0000000-0"
      InputProps={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputComponent: TextMaskCustom as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputProps: {
          mask: "00000-0000000-0",
          name: "cnic",
          onChange: (event: { target: { name: string; value: string } }) => {
            onChange(event.target.value);
          },
        } as any,
      }}
    />
  );
}

export default TextMaskCustom;
