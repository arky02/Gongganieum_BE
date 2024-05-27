module.exports = {
  apps: [
    {
      name: "poppop-backend",
      script: "app.js",
      watch: ["server", "client"],
      instances: 1,
      exec_mode: "cluster",
      exec_interpreter: "node",
    },
  ],
};
