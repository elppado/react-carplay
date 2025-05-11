use wasm_bindgen::prelude::*;
use js_sys::Uint8ClampedArray;
use web_sys::ImageData;

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
    pub fn new(width: u32, height: u32) -> VideoProcessor {
        VideoProcessor {
            width,
            height,
            buffer: vec![0; (width * height * 4) as usize],
            last_frame_time: 0.0,
            frame_skip_threshold: 16.67, // 약 60fps
        }
    }

    pub fn process_frame(&mut self, frame_data: &[u8]) -> Vec<u8> {
        let current_time = js_sys::Date::now();
        if current_time - self.last_frame_time < self.frame_skip_threshold {
            return self.buffer.clone();
        }

        self.last_frame_time = current_time;
        self.buffer.copy_from_slice(frame_data);
        self.buffer.clone()
    }

    pub fn set_frame_skip_threshold(&mut self, threshold: f64) {
        self.frame_skip_threshold = threshold;
    }
}

#[wasm_bindgen]
pub fn create_image_data(data: &[u8], width: u32, height: u32) -> Result<ImageData, JsValue> {
    let array = Uint8ClampedArray::new_with_length((width * height * 4) as u32);
    array.copy_from(data);
    ImageData::new_with_u8_clamped_array_and_sh(array, width, height)
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

