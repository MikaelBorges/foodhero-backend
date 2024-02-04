const productModel = require("../models/productModel");

module.exports = (app, db) => {
  app.get("/products", async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Récupère le paramètre de la page, utilise 1 si non défini ou invalide
    const pageSize = 10; // Nombre d'éléments par page

    try {
      // Récupérer les paramètres de filtrage depuis la requête
      const { categories, minPrice, maxPrice, sort, title, location } =
        req.query;

      // Construire le filtre en fonction des paramètres fournis
      const filter = {};
      if (categories) {
        filter.strCategory = { $in: categories.split(",") }; // Filtrer par plusieurs catégories
      }
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) {
          filter.price.$gte = minPrice;
        }
        if (maxPrice) {
          filter.price.$lte = maxPrice;
        }
      }
      if (title) {
        filter.strMeal = { $regex: title, $options: "i" }; // Recherche insensible à la casse et correspondance partielle
      }
      if (location) {
        filter.location = { $regex: location, $options: "i" }; // Recherche insensible à la casse et correspondance partielle
      }

      // Construire le tri en fonction du paramètre sort
      const sortOptions = {};
      if (sort === "asc") {
        sortOptions.idMeal = 1; // Tri ascendant (plus ancien d'abord)
      } else {
        sortOptions.idMeal = -1; // Tri descendant (plus récent d'abord), c'est le tri par défaut
      }

      const totalProducts = await productModel.countDocuments(filter);

      const productsRaw = await productModel
        .find(filter)
        .sort(sortOptions)
        .skip((page - 1) * pageSize) // Ignorer les éléments sur les pages précédentes
        .limit(pageSize); // Limiter les résultats à la taille de la page

      res.json({ totalProducts, productsRaw });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Erreur lors de la récupération des produits." });
    }
  });

  app.get("/products/categories", async (req, res, next) => {
    const categories = [
      "Seafood",
      "Beef",
      "Miscellaneous",
      "Lamb",
      "Chicken",
      "Vegetarian",
      "Pork",
      "Pasta",
      "Dessert",
      "Starter",
      "Breakfast",
      "Side",
      "Vegan",
      "Goat",
    ];

    res.json(categories);
  });

  app.get("/product/:id", async (req, res, next) => {
    const id = req.params.id;
    try {
      const populatedProduct = await productModel
        .findById(id)
        .populate({ path: "userId", select: "firstname" });

      if (!populatedProduct) res.status().json({ error: "Produit non trouvé" });

      res.json(populatedProduct);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erreur lors de la récupération du produit" });
    }
  });

  app.post("/product/new", async (req, res, next) => {
    const { title, location, price, category, userId } = req.query;

    const allProducts = await productModel.find();
    const sortedProducts = allProducts.sort((a, b) => {
      const idMealA = parseInt(a.idMeal);
      const idMealB = parseInt(b.idMeal);
      return idMealB - idMealA;
    });
    const idMealNumber = Number(sortedProducts[0].idMeal);

    const newProductData = {
      idMeal: String(idMealNumber + 1),
      strMeal: title,
      location,
      price,
      strCategory: category,
      userId,
    };
    console.log("newProductData", newProductData);
    const newProduct = new productModel(newProductData);
    newProduct.save(async function (err) {
      if (err) res.json(500);
      else res.json(200);
    });
  });
};
