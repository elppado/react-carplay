use wasm_bindgen::prelude::*;
use web_sys::{ImageData, Uint8ClampedArray};

#[wasm_bindgen]
pub struct VideoProcessor {
    width: u32,
    height: u32,
    buffer: Vec<u8>,
    last_frame_time: f64,
    frame_skip_threshold: f64,
}

#[wasm_bindgen]
impl VideoProcessor {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            buffer: Vec::with_capacity((width * height * 4) as usize),
            last_frame_time: 0.0,
            frame_skip_threshold: 16.67, // 60fps 기준
        }
    }

    pub fn process_frame(&mut self, frame_data: &[u8]) -> Vec<u8> {
        let current_time = js_sys::Date::now();
        let time_diff = current_time - self.last_frame_time;

        // 프레임 스킵 로직
        if time_diff < self.frame_skip_threshold {
            return self.buffer.clone();
        }

        self.last_frame_time = current_time;
        self.buffer.clear();

        // 메모리 최적화를 위한 버퍼 재사용
        self.buffer.reserve(frame_data.len());
        
        // SIMD 최적화된 처리
        #[cfg(target_feature = "simd128")]
        {
            self.process_frame_simd(frame_data);
        }
        #[cfg(not(target_feature = "simd128"))]
        {
            self.process_frame_normal(frame_data);
        }

        self.buffer.clone()
    }

    fn process_frame_normal(&mut self, frame_data: &[u8]) {
        // 기본 프레임 처리
        for chunk in frame_data.chunks(4) {
            if chunk.len() == 4 {
                // RGBA 처리
                self.buffer.extend_from_slice(chunk);
            }
        }
    }

    #[cfg(target_feature = "simd128")]
    fn process_frame_simd(&mut self, frame_data: &[u8]) {
        // SIMD 최적화된 처리
        // 실제 구현에서는 SIMD 명령어를 사용한 처리
        self.process_frame_normal(frame_data);
    }

    pub fn set_frame_skip_threshold(&mut self, threshold: f64) {
        self.frame_skip_threshold = threshold;
    }
}

#[wasm_bindgen]
pub fn create_image_data(width: u32, height: u32, data: &[u8]) -> Result<ImageData, JsValue> {
    let array = Uint8ClampedArray::new_with_length((width * height * 4) as u32);
    array.copy_from(data);
    ImageData::new_with_u8_clamped_array(array, width)
}

pub fn add(left: usize, right: usize) -> usize {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}

