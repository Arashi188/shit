import { Router, type RequestHandler } from "express";
import { ZodError } from "zod";
import { CatalogNotFoundError, CatalogService } from "../domain/catalog.js";

function respondWithCatalogErrors(handler: RequestHandler): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Invalid catalog request", issues: error.issues.map(({ path, message }) => ({ path, message })) });
        return;
      }
      if (error instanceof CatalogNotFoundError) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.status(503).json({ error: "Catalog data is temporarily unavailable" });
    }
  };
}

export function createCatalogRouter(service: CatalogService): Router {
  const router = Router();
  router.get("/products", respondWithCatalogErrors(async (req, res) => {
    res.status(200).json(await service.listProducts(req.query));
  }));
  router.get("/products/:slug", respondWithCatalogErrors(async (req, res) => {
    res.status(200).json(await service.getProduct(req.params.slug));
  }));
  router.get("/categories", respondWithCatalogErrors(async (_req, res) => {
    res.status(200).json({ items: await service.listCategories() });
  }));
  router.get("/currencies", respondWithCatalogErrors(async (_req, res) => {
    res.status(200).json({ items: await service.listCurrencies() });
  }));
  return router;
}
