const productModel = require("../models/productModel");
const userModel = require("../models/userModel");

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
        const categoriesArray = categories.split(",");
        const glutenFreeFilterWanted = categoriesArray.find(
          (category) => category === "Gluten free"
        );
        if (glutenFreeFilterWanted)
          filter.strCategory = { $all: categoriesArray };
        else filter.strCategory = { $in: categoriesArray };
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
      res.status(200).json({ totalProducts, productsRaw });
    } catch (error) {
      res.status(500).json({ message: String(error) });
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

  app.get("/product/:productId", async (req, res, next) => {
    const { productId } = req.params;
    try {
      const populatedProductRaw = await productModel
        .findById(productId)
        .populate("user.id", "firstname");
      if (!populatedProductRaw)
        res.status(404).json({ message: "Produit non trouvé" });
      const populatedProduct = {
        ...populatedProductRaw._doc,
        user: populatedProductRaw.user.id,
      };
      res.status(200).json(populatedProduct);
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.get("/products/user/:userId", async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // Récupère le paramètre de la page, utilise 1 si non défini ou invalide
    const pageSize = 10; // Nombre d'éléments par page
    const { userId } = req.params;
    try {
      const totalProducts = await productModel.countDocuments({
        "user.id": userId,
      });
      const productsRaw = await productModel
        .find({ "user.id": userId })
        .skip((page - 1) * pageSize)
        .limit(pageSize);
      const user = await userModel
        .findById(userId)
        .select("-phone -cryptedPassword");
      res
        .status(200)
        .json({ totalProducts, productsRaw, firstname: user.firstname });
    } catch (error) {
      res.status(500).json({ message: String(error) });
    }
  });

  app.post("/product/new", async (req, res, next) => {
    const { title, location, price, categories, userId } = req.query;
    const categoriesArray = categories.split(",");
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
      strCategory: categoriesArray,
      user: {
        id: userId,
      },
    };
    const newProduct = new productModel(newProductData);
    newProduct.save(async function (error, savedProduct) {
      if (error) res.status(500).json({ message: String(error) });
      else res.status(200).json(savedProduct._id);
    });
  });

  app.delete("/product/delete/:productId", async (req, res, next) => {
    const { productId } = req.params;
    productModel.findByIdAndDelete(productId, async function (error) {
      if (error) res.status(500).json({ message: String(error) });
      else {
        const productDeleted = await productModel.findById(productId);
        if (!productDeleted) res.json(productId);
      }
    });
  });

  app.put("/product/update/:productId", async (req, res, next) => {
    const { productId } = req.params;
    const { title, location, price, categories } = req.query;
    const categoriesArray = categories.split(",");
    try {
      const productFound = await productModel.findById(productId);
      if (productFound) {
        await productModel.findByIdAndUpdate(productId, {
          strMeal: title,
          price,
          location,
          strCategory: categoriesArray,
        });
        const updatedProductFound = await productModel.findById(productId);
        const updatedProduct = {
          title: updatedProductFound.strMeal,
          location: updatedProductFound.location,
          price: updatedProductFound.price,
          categories: updatedProductFound.strCategory,
        };
        res.status(200).json(updatedProduct);
      } else {
        res.status(400).json("Annonce non trouvée");
      }
    } catch (error) {
      res.status(500).json(String(error));
    }
  });

  app.put("/product/updateImages/:productId", async (req, res, next) => {
    const { productId } = req.params;
    const { images } = req.body;
    try {
      const productFound = await productModel.findById(productId);
      if (productFound) {
        await productModel.findByIdAndUpdate(productId, {
          strMealPreview: images[0],
          strMealThumb: images,
        });
        const updatedProductFound = await productModel.findById(productId);
        const updatedProduct = {
          title: updatedProductFound.strMeal,
          location: updatedProductFound.location,
          price: updatedProductFound.price,
          categories: updatedProductFound.strCategory,
          image: strMealPreview,
          imageThumb: updatedProductFound.strMealThumb,
        };
        res.status(200).json(updatedProduct);
      } else {
        res.status(400).json("Annonce non trouvée");
      }
    } catch (error) {
      res.status(500).json(String(error));
    }
  });
};
