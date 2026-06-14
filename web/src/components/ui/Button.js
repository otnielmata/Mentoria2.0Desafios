export default function Button({
  as: Component = "button",
  children,
  className = "",
  isLoading = false,
  onClick,
  tabIndex,
  variant = "primary",
  ...props
}) {
  const disabled = props.disabled || isLoading;
  const isNativeButton = Component === "button";
  const shouldHandleClick = Boolean(onClick) || (disabled && !isNativeButton);

  function handleClick(event) {
    if (disabled && !isNativeButton) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
  }

  return (
    <Component
      aria-busy={isLoading || undefined}
      aria-disabled={!isNativeButton && disabled ? true : undefined}
      className={`button button-${variant} ${isLoading ? "button-loading" : ""} ${className}`.trim()}
      {...props}
      disabled={isNativeButton ? disabled : undefined}
      onClick={shouldHandleClick ? handleClick : undefined}
      tabIndex={disabled && !isNativeButton ? -1 : tabIndex}
    >
      {children}
    </Component>
  );
}
