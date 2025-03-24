در زیر یک نمونه کد آورده شده که با استفاده از Axios Interceptor و Web Lock API، درخواست‌های همزمان هنگام رفرش توکن را به‌صورت سریال مدیریت می‌کند. در این کد، زمانی که توکن منقضی شده و اولین درخواست، قفل مربوط به «refreshToken» را اخذ می‌کند، سایر درخواست‌ها منتظر می‌مانند تا قفل آزاد شود و توکن جدید دریافت گردد. 

```js
import axios from 'axios';

// ایجاد یک نمونه از axios
const axiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  // سایر تنظیمات مانند timeout و ...
});

// این تابع درخواست‌های منقضی‌شده را زمانی که توکن جدید آماده شد، اجرا می‌کند.
const onTokenRefreshed = (newToken, pendingRequests) => {
  pendingRequests.forEach(callback => callback(newToken));
};

// آرایه‌ای برای نگهداری درخواست‌هایی که منتظر توکن جدید هستند
let pendingRequests = [];

// افزوده شدن توکن به هدر هر درخواست
axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = 'Bearer ' + token;
  }
  return config;
});

// اینترفیس پاسخ جهت مدیریت خطای 401 (Unauthorized)
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const { config, response } = error;
    // اگر پاسخ خطای 401 باشد و درخواست قبلاً تکرار نشده باشد:
    if (response && response.status === 401 && !config._retry) {
      config._retry = true;
      
      try {
        // استفاده از Web Lock API برای قفل کردن عملیات رفرش توکن
        const newToken = await navigator.locks.request('refreshToken', async () => {
          // اگر چند درخواست به صورت همزمان وارد این بخش شدند،
          // فقط اولین درخواست عملیات رفرش توکن را انجام می‌دهد.
          // بقیه از طریق lock منتظر نتیجه خواهند ماند.
          
          // اگر توکن قبلاً توسط یک درخواست دیگر به‌روزرسانی شده باشد،
          // می‌توانیم همان را استفاده کنیم.
          const storedToken = localStorage.getItem('accessToken');
          if (storedToken && storedToken !== config.headers['Authorization']) {
            return storedToken;
          }
          
          // فراخوانی API جهت رفرش توکن
          const refreshResponse = await axios.post('https://api.example.com/auth/refresh', {
            refreshToken: localStorage.getItem('refreshToken')
          });
          const refreshedToken = refreshResponse.data.accessToken;
          // ذخیره توکن جدید در localStorage
          localStorage.setItem('accessToken', refreshedToken);
          return refreshedToken;
        });
        
        // به‌روزرسانی هدر درخواست اصلی با توکن جدید
        config.headers['Authorization'] = 'Bearer ' + newToken;
        
        // اجرای درخواست‌های در انتظار (در صورت وجود)
        onTokenRefreshed(newToken, pendingRequests);
        pendingRequests = [];
        
        // ارسال مجدد درخواست اولیه با توکن به‌روزشده
        return axiosInstance(config);
      } catch (refreshError) {
        // در صورت خطا در عملیات رفرش توکن، خطا را به زنجیره برگردانید.
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

### توضیحات کد

- **استفاده از Web Lock API:**  
  از متد `navigator.locks.request` استفاده شده تا یک قفل با نام `refreshToken` ایجاد شود. این تضمین می‌کند که فقط یک درخواست به‌روزرسانی توکن در هر زمان انجام شود و سایر درخواست‌ها منتظر بمانند.

- **به‌روزرسانی توکن:**  
  در بخش قفل، ابتدا بررسی می‌شود که آیا توکن در حال حاضر به‌روزرسانی شده است یا خیر. اگر بله، از توکن جدید استفاده می‌شود؛ در غیر این صورت، یک درخواست API برای رفرش توکن ارسال می‌شود.

- **Pending Requests:**  
  در این مثال، از آرایه‌ای برای ذخیره درخواست‌های در انتظار استفاده شده است تا در صورت نیاز بعد از دریافت توکن جدید بتوانند به‌روزرسانی شده و ارسال شوند. (در این نمونه، درخواست‌های منتظر تنها به‌عنوان نمونه آورده شده‌اند؛ شما می‌توانید بر اساس نیاز پروژه، آن‌ها را مدیریت و نگهداری کنید.)

این پیاده‌سازی تضمین می‌کند که در صورت انقضای توکن، تنها یک درخواست رفرش انجام شده و سایر درخواست‌ها با توکن به‌روزشده ادامه می‌یابند.
