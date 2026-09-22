export const absLength = (value: string): number =>
  value
    .split('')
    .map((item: string) => parseInt(item))
    .filter((item: number) => !isNaN(item)).length;

export type InputProps = {
  leaveFieldCallback?: () => void;
  focus?: boolean;
  tabIndex: number;
  data?: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  onError?: (value: string) => void;
};
