CREATE TABLE "carts" (
  "id" UUID NOT NULL, "user_id" UUID, "guest_token_hash" CHAR(64), "coupon_code" VARCHAR(40), "shipping_method_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");
CREATE UNIQUE INDEX "carts_guest_token_hash_key" ON "carts"("guest_token_hash");
CREATE TABLE "cart_items" (
  "id" UUID NOT NULL, "cart_id" UUID NOT NULL, "product_id" UUID NOT NULL, "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id", "product_id");
CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");
CREATE TABLE "coupons" (
  "id" UUID NOT NULL, "code" VARCHAR(40) NOT NULL, "percent_off" INTEGER, "amount_off_minor" INTEGER,
  "currency_code" CHAR(3), "minimum_subtotal_minor" INTEGER NOT NULL DEFAULT 0, "usage_limit" INTEGER,
  "used_count" INTEGER NOT NULL DEFAULT 0, "starts_at" TIMESTAMPTZ(6), "expires_at" TIMESTAMPTZ(6),
  "is_enabled" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_is_enabled_starts_at_expires_at_idx" ON "coupons"("is_enabled", "starts_at", "expires_at");
CREATE TABLE "shipping_methods" (
  "id" UUID NOT NULL, "name" VARCHAR(100) NOT NULL, "country_code" CHAR(2), "currency_code" CHAR(3) NOT NULL,
  "fee_minor" INTEGER NOT NULL, "estimated_days_min" INTEGER NOT NULL, "estimated_days_max" INTEGER NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "shipping_methods_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "shipping_methods_is_enabled_country_code_currency_code_idx" ON "shipping_methods"("is_enabled", "country_code", "currency_code");
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_shipping_method_id_fkey" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
