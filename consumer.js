const amqp = require("amqplib");
const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "rootpassword",
  database: "orders",
});

connection.connect();

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

async function receiveOrders() {
  const conn = await amqp.connect("amqp://mikelopster:password@localhost:5672");
  const channel = await conn.createChannel();

  const queue = "orders-new";
  await channel.assertQueue(queue, { durable: true });

  console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);

  channel.prefetch(1);

  channel.consume(queue, async (msg) => {
    try {
      const order = JSON.parse(msg.content.toString());
      console.log(" [x] Received %s", order);

      await sleep(10000);

      const sql = "INSERT INTO orders SET ?";
      connection.query(sql, order, (error, results) => {
        if (error) throw error;
        console.log("Order saved to database with id: " + results.insertId);
      });

      // บอกว่าได้ message แล้ว
      channel.ack(msg);
    } catch (error) {
      console.log("Error:", error.message);
    }
  });
}

receiveOrders();