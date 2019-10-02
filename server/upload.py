import os
import csv
from flask import Flask, flash, request, Response, json
from werkzeug.utils import secure_filename
from flask import send_from_directory, redirect, url_for
from flask_cors import CORS


UPLOAD_FOLDER = './audios'
ALLOWED_EXTENSIONS = {'wav'}
CSV_FILE = '__user_data.csv'

app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['CORS_HEADERS'] = 'Content-Type'
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET', 'POST'])
def upload_file():

    if request.method == 'POST':

        user_age = request.form['age']
        user_gender = request.form['gender']
        user_files = {}

        files = request.files.to_dict()
        for file in files:
            file_name = files[file].filename
            if file_name and allowed_file(file_name):
                user_files[file_name] = files[file]

        if user_age and user_gender and len(user_files) == 3:
            # save data
            save_csv_data(user_age, user_gender, user_files);
            save_files(user_files);
            print('OK!!!')
            # return json.dumps({'success':True, 'message':'Created'}), 201, {'ContentType':'application/json'}
            data = {
                'success': True,
                'message': 'Created'
            }
            js = json.dumps(data)
            resp = Response(js, status=201, mimetype='application/json')
            return resp
        else:
            print('Incomplete data set')
            # return json.dumps({'success':True, 'message':'Created'}), 400, {'ContentType':'application/json'}
            data = {
                'error': 'Incomplete data set',
                'status': 400
            }
            js = json.dumps(data)
            resp = Response(js, status=400, mimetype='application/json')
            return resp

        return redirect(request.url)

    return '''
    <!doctype html>
    <title>Upload your audio files</title>
    <h1>Upload your audio files</h1>
    <form method=post enctype=multipart/form-data>
      Age: <input type=text name="age" size="20"><br/>
      Gender: <select id="gender" name="gender">
        <option>Select</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select><br/>
      <input type=file name="audio_1569999072594"><br/>
      <input type=file name="audio_1569999081330"><br/>
      <input type=file name="audio_1569999103207"><br/>
      <input type=submit value=Upload>
    </form>
    '''


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'],
                               filename)

def save_csv_data(user_age, user_gender, user_files):
    file_exists = os.path.isfile(CSV_FILE)
    csv_file = open(CSV_FILE, 'a')
    csv_writer = csv.writer(csv_file)
    if not file_exists:
        csv_writer.writerow(['Age', 'Gender', 'File 1', 'File 2', 'File 3'])

    row = [user_age, user_gender] + list(user_files.keys())
    csv_writer.writerow(row)
    csv_file.close()

def save_files(user_files):
    for filename, file in user_files.items():
        filename = secure_filename(filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
