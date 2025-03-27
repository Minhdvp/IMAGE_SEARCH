import os
import pickle
import numpy as np
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input
from tensorflow.keras.models import Model
from PIL import Image

# Hàm tạo model ResNet-50
# Chúng ta lấy đặc trưng từ tầng cuối cùng trước lớp fully connected ('avg_pool')
def get_extract_model():
    resnet_model = ResNet50(weights="imagenet", include_top=False, pooling='avg')
    return Model(inputs=resnet_model.input, outputs=resnet_model.output)

# Hàm tiền xử lý ảnh
def image_preprocess(img):
    img = img.resize((224, 224))
    img = img.convert("RGB")
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)  # Chuẩn hóa theo chuẩn của ResNet-50
    return x

# Hàm trích xuất vector đặc trưng
def extract_vector(model, image_path):
    print("Đang xử lý:", image_path)
    img = Image.open(image_path)
    img_tensor = image_preprocess(img)
    
    # Trích xuất đặc trưng
    vector = model.predict(img_tensor)[0]
    vector = vector / np.linalg.norm(vector)  # Chuẩn hóa L2 norm
    return vector

# Định nghĩa thư mục chứa ảnh
data_folder = "dataset"

# Khởi tạo model
model = get_extract_model()

vectors = []
paths = []

# Lặp qua từng ảnh trong thư mục và trích xuất đặc trưng
for image_path in os.listdir(data_folder):
    image_path_full = os.path.join(data_folder, image_path)
    image_vector = extract_vector(model, image_path_full)
    vectors.append(image_vector)
    paths.append(image_path_full)

# Lưu kết quả vào file
vector_file = "vectors_resnet.pkl"
path_file = "paths_resnet.pkl"

pickle.dump(vectors, open(vector_file, "wb"))
pickle.dump(paths, open(path_file, "wb"))

print("Trích xuất đặc trưng hoàn tất. Dữ liệu đã được lưu.")