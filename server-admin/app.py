from flask import Flask, jsonify, request
import subprocess

app = Flask(__name__)

@app.route('/status')
def status():
    # 도커 컨테이너 상태 확인
    docker_ps = subprocess.getoutput('docker ps --format "{{.Names}}: {{.Status}}"')
    # 도커 CLI 버전 확인
    docker_version = subprocess.getoutput('docker --version')
    return jsonify({
        'status': 'ok',
        'docker_status': docker_ps,
        'docker_cli_version': docker_version
    })

@app.route('/restart', methods=['POST'])
def restart():
    # 도커 컴포즈 전체 재시작
    result = subprocess.getoutput('docker compose restart')
    return jsonify({'status': 'restarted', 'result': result})

@app.route('/logs')
def logs():
    # 최근 100줄 로그 반환
    result = subprocess.getoutput('docker compose logs --tail 100')
    return jsonify({'logs': result})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001) 