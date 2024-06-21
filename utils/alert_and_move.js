function alert_and_move(path, msg) {
  return `<script>
            alert('${msg}')
            location.href = '${path}'
            </script>`;
}

module.exports = alert_and_move;
