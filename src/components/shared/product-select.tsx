"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/types/database";

interface ProductSelectProps {
  products: Pick<Product, "id" | "name">[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ProductSelect({
  products,
  value,
  onChange,
  disabled,
}: ProductSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="اختر الصنف..." />
      </SelectTrigger>
      <SelectContent>
        {products.map((product) => (
          <SelectItem key={product.id} value={product.id}>
            {product.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
