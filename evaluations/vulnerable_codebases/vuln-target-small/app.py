"""Minimal health-check microservice for evaluation testing."""
from flask import Flask, jsonify
import requests

app = Flask(__name__)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "health-monitor"})


@app.route("/check/<target>")
def check(target):
    try:
        resp = requests.get(f"http://{target}", timeout=5)
        return jsonify({"target": target, "status_code": resp.status_code})
    except requests.RequestException as e:
        return jsonify({"target": target, "error": str(e)}), 503


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
