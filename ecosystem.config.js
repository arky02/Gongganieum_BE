module.exports = {
  apps: [
    {
      name: "poppop-backend",
      script: "app.js",
      watch: ["server", "client"],
      instances: 1,
      exec_mode: "cluster",
      exec_interpreter: "node",
      // Delay between restart
      watch_delay: 1000,
      ignore_watch: ["node_modules", "client/img", "\\.git", "*.log"],
    },
  ],
};
