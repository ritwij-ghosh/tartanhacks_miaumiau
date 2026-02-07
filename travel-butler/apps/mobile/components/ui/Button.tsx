import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const base = "rounded-2xl py-3.5 px-6 items-center justify-center flex-row";
  const variants = {
    primary: "bg-brand-500 active:bg-brand-600",
    secondary: "bg-brand-100 active:bg-brand-200",
    ghost: "bg-transparent",
  };
  const textVariants = {
    primary: "text-white font-semibold text-body-md",
    secondary: "text-brand-600 font-semibold text-body-md",
    ghost: "text-brand-500 font-medium text-body-md",
  };

  return (
    <TouchableOpacity
      className={`${base} ${variants[variant]} ${disabled || loading ? "opacity-50" : ""} ${className}`}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#fff" : "#6366F1"}
          style={{ marginRight: 8 }}
        />
      )}
      <Text className={textVariants[variant]}>{title}</Text>
    </TouchableOpacity>
  );
}
