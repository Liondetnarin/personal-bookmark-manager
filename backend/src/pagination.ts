import { BadRequestException } from '@nestjs/common';

export function pagination(query: Record<string, unknown>) {
  const integer = (value: unknown, fallback: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) throw new BadRequestException();
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) throw new BadRequestException();
    return number;
  };
  const page = integer(query.page, 1);
  const pageSize = integer(query.pageSize, 20);
  const skip = (page - 1) * pageSize;
  if (pageSize > 100 || !Number.isSafeInteger(skip)) throw new BadRequestException();
  return { page, pageSize, skip };
}
