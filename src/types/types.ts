import { Alignment, CustomTableItem } from '@node-escpos/core/index';

export interface UsbPrinterParameter {
  CMD: 'FONT' | 'ALIGN' | 'STYLE' | 'TEXT' | 'FEED' | 'TABLE' | 'LINE_SPACE';
  ARGS: Alignment | CustomTableItem[] | string | number;
}

// export type Root = UsbPrinterParameter[];
