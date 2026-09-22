export const mobileCardStyles = {
  shell: {
    borderRadius: '12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    padding: '10px 12px 10px',
    marginBottom: '.8rem',
  },
  header: {
    minHeight: '24px',
    paddingBottom: '6px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    marginBottom: '8px',
    adornmentGap: '4px',
    contentGap: '0px',
    actionGap: '8px',
    actionColumnWidth: '20px',
    checkboxColumnWidth: '24px',
    accessoryColumnWidth: '20px',
    sideColumnWidth: '44px',
    titleGap: '4px',
    bleedX: '12px',
  },
  fieldGrid: {
    rightOuterColumnWidth: '170px',
    groupGap: '28px',
  },
  // Compact variant: cards whose rows carry wider content than the home
  // InvoiceCard (e.g. "Method: Visa **** 4242", "To Pay:") let both columns
  // size to content so nothing overlaps at phone widths.
  fieldGridCompact: {
    rightOuterColumnWidth: 'minmax(150px, max-content)',
    groupGap: '28px',
    // Fits short labels like "Doc #:"/"Date:"/"Ref #:". Cards with a longer
    // left label (e.g. ScheduledPaymentsCardsList's "Sched ID:") pass an
    // explicit leftLabelWidth override to MobileCardFieldGrid instead.
    leftLabelWidth: '52px',
    rightValueMinWidth: '88px',
    leftPairGap: '10px',
  },
  fieldColumn: {
    leftLabelWidth: '44px',
    leftValueMinWidth: '92px',
    rightLabelWidth: '50px',
    leftPairGap: '14px',
    rightPairGap: '12px',
    rightValueMinWidth: '108px',
    rowGap: '4px',
  },
  fieldRow: {
    minHeight: '22px',
    separatorPaddingTop: '5px',
    separatorMarginTop: '0px',
    separatorBorderWidth: '1px',
    separatorBorderStyle: 'solid',
  },
  typography: {
    titleFontSize: { xs: '12px', sm: '14px' },
    titleFontWeight: 700,
    labelFontSize: { xs: '12px', sm: '14px' },
    labelFontWeight: 500,
    labelFontStyle: 'normal',
    labelColor: '#8B93A5',
    valueFontSize: { xs: '12px', sm: '14px' },
    valueFontWeight: 500,
    valueFontStyle: 'normal',
    valueColor: '#0D0D12',
    emphasisFontWeight: 700,
  },
} as const;

export type MobileCardStyles = typeof mobileCardStyles;
