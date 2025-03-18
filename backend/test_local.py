from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def home():
    return 'App is running'

@app.route('/health')
def health():
    return 'Healthy'

if __name__ == '__main__':
    print('Starting test app...')
    port = int(os.environ.get('PORT', 5000))
    print(f'Port: {port}')
    app.run(host='0.0.0.0', port=port) 