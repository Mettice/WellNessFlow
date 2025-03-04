from flask import Flask
from .tasks import start_background_tasks, stop_background_tasks

# Start background tasks
start_background_tasks()

# Register shutdown handler
def register_shutdown_handler(app):
    @app.teardown_appcontext
    def shutdown_tasks(exception=None):
        stop_background_tasks() 