from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import numpy as np
import pickle
import os
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input
from tensorflow.keras.models import Model
from PIL import Image
import shutil
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO

app = FastAPI()
app.mount("/dataset", StaticFiles(directory="dataset"), name="dataset")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Load model
def get_extract_model():
    resnet_model = ResNet50(weights="imagenet", include_top=False, pooling='avg')
    return Model(inputs=resnet_model.input, outputs=resnet_model.output)

model = get_extract_model()

# Load vector database
vectors = pickle.load(open("vectors_resnet.pkl", "rb"))
paths = pickle.load(open("paths_resnet.pkl", "rb"))

# Tiền xử lý ảnh
def image_preprocess(img):
    img = img.resize((224, 224)).convert("RGB")
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    return x

# Trích xuất đặc trưng
def extract_vector(img_path):
    img = Image.open(img_path)
    img_tensor = image_preprocess(img)
    vector = model.predict(img_tensor)[0]
    return vector / np.linalg.norm(vector)

def extract_vector_from_image(img: Image.Image):
    img_tensor = image_preprocess(img)
    vector = model.predict(img_tensor)[0]
    return vector / np.linalg.norm(vector)

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    # Đọc file trực tiếp vào RAM (không lưu vào ổ đĩa)
    image_bytes = await file.read()
    img = Image.open(BytesIO(image_bytes))

    # Trích xuất vector ảnh tải lên
    search_vector = extract_vector_from_image(img)

    # Tính khoảng cách đến tất cả vector
    distance = np.linalg.norm(vectors - search_vector, axis=1)
    K = 10  # Số ảnh gần nhất cần tìm
    ids = np.argsort(distance)[:K]
    nearest_images = [f"/dataset/{os.path.basename(paths[id])}" for id in ids]
    
    print("Ảnh tương tự:", nearest_images)
    return JSONResponse(content={"similar_images": nearest_images})
