import type { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const variants = cva('site-button', {
  variants: {
    variant: {
      default: 'site-button-primary',
      secondary: 'site-button-secondary',
      outline: 'site-button-outline',
    },
  },
  defaultVariants: { variant: 'default' },
});
export function Button({
  asChild = false,
  variant,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component className={cn(variants({ variant }), className)} {...props} />
  );
}
