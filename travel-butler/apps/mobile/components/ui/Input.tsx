import { TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  dark?: boolean;
}

export function Input({ dark = false, className = "", ...props }: InputProps) {
  const base = "rounded-xl px-4 py-3.5 text-body-md";
  const theme = dark
    ? "bg-white/10 text-white placeholder:text-white/50"
    : "bg-gray-100 text-gray-900 placeholder:text-gray-400";

  return (
    <TextInput
      className={`${base} ${theme} ${className}`}
      placeholderTextColor={dark ? "rgba(255,255,255,0.5)" : "#9CA3AF"}
      {...props}
    />
  );
}
