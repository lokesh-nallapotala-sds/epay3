import { useIntl } from 'react-intl';

import EpaySelectionButton from 'shared/components/EpaySelectionButton';

interface ExportSelectionButtonProps {
  onSelect: (option: string) => void;
  width?: string;
  height?: string;
  padding?: string;
  label?: string;
}

export default function ExportSelectionButton({
  onSelect,
  width = '100%',
  height,
  padding,
  label = '',
}: ExportSelectionButtonProps) {
  const intl = useIntl();
  const f = (id: string) => intl.formatMessage({ id: id });

  return (
    <EpaySelectionButton
      name={f('app.common.export')}
      data={[
        { key: 'csv', value: f('app.common.export.csv.all') },
        { key: 'excel', value: f('app.common.export.xlsx.all') },
      ]}
      optionKey="key"
      optionText="value"
      placeholder={f('app.common.export')}
      onSelect={onSelect}
      width={width}
      label={label}
      height={height}
      padding={padding}
    />
  );
}
