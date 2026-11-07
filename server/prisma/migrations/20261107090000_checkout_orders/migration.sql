CREATE TABLE "orders" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "guest_token_hash" CHAR(64),
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "currency_code" CHAR(3) NOT NULL,
  "subtotal_minor" INTEGER NOT NULL DEFAULT 0,
  "discount_minor" INTEGER NOT NULL DEFAULT 0,
  "shipping_minor" INTEGER NOT NULL DEFAULT 0,
  "total_minor" INTEGER NOT NULL DEFAULT 0,
  "coupon_code" VARCHAR(40),
  "shipping_method_id" UUID,
  "payment_reference" VARCHAR(100),
  "payment_status" VARCHAR(30),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "orders_shipping_method_id_fkey" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "orders_guest_token_hash_key"
  ON "orders"("guest_token_hash")
  WHERE "guest_token_hash" IS NOT NULL;

CREATE INDEX "orders_user_id_idx"
  ON "orders"("user_id");

CREATE INDEX "orders_status_idx"
  ON "orders"("status");

CREATE TABLE "order_items" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(200) NOT NULL,
  "price_minor" INTEGER NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "image_url" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT
);

CREATE INDEX "order_items_order_id_idx"
  ON "order_items"("order_id");
