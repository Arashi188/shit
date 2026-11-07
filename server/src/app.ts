import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { AGE_GATE_COOKIE } from "./integrations/age-gate/age-gate.js";
import { requireAgeVerified } from "./integrations/age-gate/require-age-verified.js";
import { SelfDeclaredAgeGate } from "./integrations/age-gate/self-declared-age-gate.js";
import { createAgeGateHandlers, healthHandler } from "./http/age-gate-handlers.js";
import { CatalogService } from "./domain/catalog.js";
import { getPrisma } from "./data/prisma.js";
import { PrismaCatalogRepository } from "./data/prisma-catalog.repository.js";
import { createCatalogRouter } from "./http/catalog.routes.js";
import { AuthService } from "./domain/auth.js";
import { PrismaAuthRepository } from "./data/prisma-auth.repository.js";
import { createMailer } from "./integrations/mailer/provider-factory.js";
import { createAuthRouter } from "./http/auth.routes.js";
import { createCartRouter } from "./http/cart.routes.js";
import { createCheckoutRouter } from "./http/checkout.routes.js";
import { createAdminRouter } from "./http/admin.routes.js";
import { createPaymentProvider } from "./integrations/payment/provider-factory.js";

export const ageGate = new SelfDeclaredAgeGate(config.AGE_GATE_SECRET);
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "32kb", strict: true }));

const prisma = getPrisma();
const mailer = createMailer(config.MAILER_PROVIDER, { from: config.MAILER_FROM, resendApiKey: config.RESEND_API_KEY });
const paymentProvider = createPaymentProvider(config.PAYMENT_PROVIDER, { stripeSecretKey: config.STRIPE_SECRET_KEY, stripeWebhookSecret: config.STRIPE_WEBHOOK_SECRET });
const authService = new AuthService(new PrismaAuthRepository(prisma), mailer);
const api = express.Router();
const ageHandlers = createAgeGateHandlers(ageGate, config.NODE_ENV === "production");
api.get("/health", healthHandler);
api.get("/age-gate/status", ageHandlers.status);
api.post("/age-gate/accept", ageHandlers.accept);
api.post("/age-gate/decline", ageHandlers.decline);
api.use(createAuthRouter(authService, config.NODE_ENV === "production", config.WEB_ORIGIN, prisma));
api.use(createCartRouter(prisma, authService, ageGate, config.NODE_ENV === "production"));
api.use(createCheckoutRouter(prisma, authService, paymentProvider, mailer, config.NODE_ENV === "production"));
api.use(createAdminRouter(prisma));
api.use(createCatalogRouter(new CatalogService(new PrismaCatalogRepository(prisma))));

app.use("/api/v1", api);
app.use("/api/v1/checkout", requireAgeVerified(ageGate));
app.use((req, res) => res.status(404).json({ error: "Not found" }));

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Malformed JSON" });
    return;
  }
  console.error("Unhandled request error", error);
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

