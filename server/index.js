const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient,ObjectId } = require('mongodb');
const PORT = process.env.PORT || 3001;
const app = express();

app.use(bodyParser.json());

const uri = "mongodb+srv://galcantara67:ipodnano09@cluster0.3tqwctv.mongodb.net/myDatabaseName?retryWrites=true&w=majority";

const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

app.get("/products", async (req, res) => {
  try {
    const database = client.db("store");
    const collection = database.collection("products");
    const result = await collection.find({}).toArray();
    res.json(result);
    
  } catch (error) {
    console.error("Error retrieving data from MongoDB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/clients", async (req, res) => {
  try {
    const database = client.db("store");
    const collection = database.collection("clientes");
    const result = await collection.find({}).toArray();
    res.json(result);
    
  } catch (error) {
    console.error("Error retrieving data from MongoDB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/salescompleted", async (req, res) => {
  try {
    const database = client.db("store");
    const collection = database.collection("ventas");
    const result = await collection.find({}).toArray();
    res.json(result);
    
  } catch (error) {
    console.error("Error retrieving data from MongoDB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Ruta para manejar las ventas
app.post("/sales", async (req, res) => {
  const sale = {
    client: req.body.client,
    paymentMethod: req.body.paymentMethod,
    totalAmount: req.body.totalAmount,
    productsSold: req.body.productsSold,
    date: req.body.date
  }

  try {
    const database = client.db("store");
    const collection = database.collection("ventas");
    const productsCollection = database.collection("products"); // Agregar la colección de productos

    console.log("Body received:", req.body);
    console.log("Venta a insertar:", sale);

    const isConnected = await client.connect().then(() => true).catch(() => false);
    if (!isConnected) {
      throw new Error("Error: No hay conexión a MongoDB");
    }

    // Insertar la venta
    const result = await collection.insertOne(sale);
    console.log('Venta exitosa');

    // Actualizar la existencia de los productos vendidos
    for (const productSold of sale.productsSold) {
      const productName = productSold.name; // Asumiendo que tienes un campo 'name' en cada objeto 'productsSold'
      const quantitySold = productSold.quantity;

      // Actualizar la existencia del producto restando la cantidad vendida
      await productsCollection.updateOne(
        { name: productName },
        { $inc: { existencia: -quantitySold } } // Resta la cantidad vendida
      );
    }

    res.status(200).json({ message: "Venta completada exitosamente" });
  } catch (error) {
    console.error("Error al realizar la venta:", error);
    res.status(500).json({ error: "Error al realizar la venta" });
  }
});


// Ruta para actualizar un producto por su nombre
app.put("/products/:id", async (req, res) => {
  const productId = req.params.id;
  const updatedProductData = req.body;
  console.log(req.params);
  console.log(req.body);

  try {
    const database = client.db("store");
    const collection = database.collection("products");

    if (!productId) {
      return res.status(400).json({ message: "Missing product id in request" });
    }
    if (Object.keys(updatedProductData).length === 0) {
      return res.status(400).json({ message: "No update data provided in request body" });
    }
    const isConnected = await client.connect().then(() => true).catch(() => false);
    if (!isConnected) {
      return res.status(500).json({ message: "Error connecting to MongoDB" });
    }

    // Eliminar el campo _id del objeto updatedProductData
    delete updatedProductData._id;

    // Update the product using `updateOne` with appropriate error handling
    const result = await collection.updateOne(
      { _id: new ObjectId(productId) },
      { $set: updatedProductData }
    );
    console.log(result);
      // Update successful, send a response
      return res.status(200).json({ message: "Product updated successfully" });
  }
  catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


app.put("/sales/:id", async (req, res) => {
  const saleId = req.params.id;
  const updatedStatus = req.body.estatus; // Assuming the status field is named "estatus"

  console.log(req.params);
  console.log(req.body);

  try {
    const database = client.db("store"); // Replace "store" with your database name
    const collection = database.collection("ventas"); // Replace "sales" with your collection name

    if (!saleId) {
      return res.status(400).json({ message: "Missing sale id in request" });
    }

    if (!updatedStatus) {
      return res.status(400).json({ message: "Missing 'estatus' field in request body" });
    }

    const isConnected = await client.connect().then(() => true).catch(() => false);
    if (!isConnected) {
      return res.status(500).json({ message: "Error connecting to MongoDB" });
    }

    // Update the sale status using `updateOne`
    const result = await collection.updateOne(
      { _id: new ObjectId(saleId) },
      { $set: { paymentMethod: updatedStatus } }
    );

    console.log(result);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Update successful, send a response
    return res.status(200).json({ message: "Sale status updated successfully" });
  } catch (error) {
    console.error("Error updating sale status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/clients/:id", async (req, res) => {
  const clientId = req.params.id;
  const updatedClientData = req.body;

  try {
    const database = client.db("store");
    const clientsCollection = database.collection("clientes");
    const salesCollection = database.collection("ventas");

    if (!clientId) {
      return res.status(400).json({ message: "Falta el ID del cliente en la solicitud" });
    }

    if (!updatedClientData) {
      return res.status(400).json({ message: "Falta la información actualizada del cliente en el cuerpo de la solicitud" });
    }

    const isConnected = await client.connect().then(() => true).catch(() => false);
    if (!isConnected) {
      return res.status(500).json({ message: "Error al conectar con MongoDB" });
    }

    const result = await clientsCollection.updateOne(
      { _id: new ObjectId(clientId) },
      { $set: updatedClientData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    // Si se indica que se han pagado todas las deudas, actualizar las ventas del cliente
    if (updatedClientData.paidAllDebts) {
      // Obtener el nombre del cliente actualizado
      const updatedClient = await clientsCollection.findOne({ _id: new ObjectId(clientId) });
    
      // Verificar si se encontró el cliente actualizado
      if (!updatedClient) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
    
      const clientName = updatedClient.name;
    
      // Actualizar las ventas del cliente con paymentMethod en 'Fiado'
      const updateResult = await salesCollection.updateMany(
        { client: clientName, paymentMethod: 'Fiado' },
        { $set: { paymentMethod: 'Pagado' } }
      );
    
      // Verificar si se actualizaron las ventas correctamente
      if (updateResult.modifiedCount === 0) {
        console.log("No se encontraron ventas para actualizar");
      }
    }

    return res.status(200).json({ message: "Cliente actualizado exitosamente" });
  } catch (error) {
    console.error("Error al actualizar el cliente:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});




// Conecta a la base de datos y luego inicia el servidor
async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

startServer();