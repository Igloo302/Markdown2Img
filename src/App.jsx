import { useState, useRef, useEffect } from 'react';
import './App.css';
import { marked } from 'marked';

const aspectRatios = {
  '2:3': { width: 1242, height: 1863 },
  '3:4': { width: 1242, height: 1656 },
  '1:1': { width: 1242, height: 1242 }
};

// 计算文本在画布上的布局信息
function calculateTextLayout(ctx, text, width, height, fontSize) {
  const maxWidth = width - 100; // 左右各留50px边距
  const paragraphs = text.split('\n');
  const pages = [[]];
  let currentY = fontSize + 30;
  let currentPage = 0;

  paragraphs.forEach(paragraph => {
    if (paragraph.trim() === '') {
      currentY += fontSize * 0.8;
      if (currentY > height - fontSize) {
        currentPage++;
        pages[currentPage] = [];
        currentY = fontSize + 30;
      }
      pages[currentPage].push({ type: 'empty', height: fontSize * 0.8 });
      return;
    }

    let currentLine = '';
    const chars = paragraph.split('');

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth) {
        if (currentY + fontSize > height - fontSize) {
          currentPage++;
          pages[currentPage] = [];
          currentY = fontSize + 30;
        }
        pages[currentPage].push({ type: 'text', content: currentLine, y: currentY });
        currentY += fontSize * 1.5;
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (currentY + fontSize > height - fontSize) {
        currentPage++;
        pages[currentPage] = [];
        currentY = fontSize + 30;
      }
      pages[currentPage].push({ type: 'text', content: currentLine, y: currentY });
      currentY += fontSize * 2;
    }
  });

  return pages;
}

// 将HTML渲染到Canvas
function renderToCanvas(canvas, html, pageIndex, aspectRatio = '2:3', fontSize = 50) {
  const ctx = canvas.getContext('2d');
  const { width, height } = aspectRatios[aspectRatio];
  canvas.width = width;
  canvas.height = height;
  
  // 设置背景色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // 设置文本样式
  ctx.fillStyle = '#000000';
  ctx.font = `${fontSize}px Arial`;
  
  // 将HTML内容转换为文本
  const text = html.replace(/<[^>]+>/g, '');
  
  // 计算所有页面的布局
  const pages = calculateTextLayout(ctx, text, width, height, fontSize);
  
  // 渲染当前页面
  if (pageIndex < pages.length) {
    const pageContent = pages[pageIndex];
    pageContent.forEach(item => {
      if (item.type === 'text') {
        ctx.fillText(item.content, 50, item.y);
      }
    });
  }
  
  return pages.length; // 返回总页数
}

function App() {
  const [markdownText, setMarkdownText] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3');
  const [fontSize, setFontSize] = useState(50);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const canvasRef = useRef(null);

  // 处理Markdown文本变化
  const handleMarkdownChange = (e) => {
    const text = e.target.value;
    setMarkdownText(text);
    const html = marked.parse(text);
    setPages([html]); // 现在我们只需要存储一个HTML字符串
    setCurrentPageIndex(0);
  };

  // 处理图片比例变化
  const handleAspectRatioChange = (e) => {
    setAspectRatio(e.target.value);
  };

  // 处理字体大小变化
  const handleFontSizeChange = (e) => {
    setFontSize(parseInt(e.target.value));
  };

  // 切换当前页
  const handlePageChange = (index) => {
    setCurrentPageIndex(index);
  };

  // 下载当前页图片
  const handleDownloadCurrentPage = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `markdown-page-${currentPageIndex + 1}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  // 下载所有页面图片
  const handleDownloadAllPages = () => {
    if (canvasRef.current && pages.length > 0) {
      const currentPage = currentPageIndex;
      let downloadCount = 0;
      
      const downloadNextPage = (index) => {
        if (index >= totalPages) {
          setCurrentPageIndex(currentPage); // 恢复到原来的页面
          return;
        }
        
        setCurrentPageIndex(index);
        // 等待Canvas渲染完成
        setTimeout(() => {
          const link = document.createElement('a');
          link.download = `markdown-page-${index + 1}.png`;
          link.href = canvasRef.current.toDataURL('image/png');
          link.click();
          downloadCount++;
          downloadNextPage(index + 1);
        }, 100);
      };
      
      downloadNextPage(0);
    }
  };

  // 当页面或设置变化时重新渲染Canvas
  useEffect(() => {
    if (canvasRef.current && pages.length > 0) {
      const numPages = renderToCanvas(
        canvasRef.current,
        pages[0],
        currentPageIndex,
        aspectRatio,
        fontSize
      );
      setTotalPages(numPages);
    }
  }, [pages, currentPageIndex, aspectRatio, fontSize]);

  return (
    <div className="app-container">
      <header>
        <h1>Markdown转图片工具</h1>
        <p className="subtitle">将Markdown文本转换为精美图片</p>
      </header>
      
      <main>
        <div className="editor-section">
          <div className="section-header">
            <h2><i className="ri-edit-line"></i> 编辑区</h2>
          </div>
          <textarea
            value={markdownText}
            onChange={handleMarkdownChange}
            placeholder="请输入Markdown文本..."
            className="markdown-input"
          />
          
          <div className="settings-panel">
            <div className="section-header">
              <h2><i className="ri-settings-3-line"></i> 设置</h2>
            </div>
            <div className="settings-content">
              <div className="setting-item">
                <label>图片比例:</label>
                <select value={aspectRatio} onChange={handleAspectRatioChange}>
                  <option value="2:3">2:3</option>
                  <option value="3:4">3:4</option>
                  <option value="1:1">1:1</option>
                </select>
              </div>
              
              <div className="setting-item">
                <label>字体大小:</label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={fontSize}
                  onChange={handleFontSizeChange}
                />
                <span>{fontSize}px</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="preview-section">
          <div className="section-header">
            <h2><i className="ri-eye-line"></i> 预览区</h2>
            <div className="preview-info">
              {totalPages > 0 && (
                <span className="page-count">
                  <i className="ri-file-list-line"></i> 共 {totalPages} 页
                </span>
              )}
            </div>
          </div>
          
          <div className="canvas-container">
            <canvas ref={canvasRef} className="preview-canvas" />
          </div>
          
          {totalPages > 1 && (
            <div className="pagination">
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index}
                  onClick={() => handlePageChange(index)}
                  className={currentPageIndex === index ? 'active' : ''}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <footer>
        <div className="footer-content">
          <div className="action-buttons">
            <button 
              onClick={handleDownloadCurrentPage}
              disabled={pages.length === 0}
              className="action-button"
            >
              <i className="ri-download-line button-icon"></i>
              下载当前页
            </button>
            <button 
              onClick={handleDownloadAllPages}
              disabled={pages.length === 0}
              className="action-button action-button-primary"
            >
              <i className="ri-download-2-line button-icon"></i>
              下载所有页
            </button>
          </div>
          <div className="copyright">
            <i className="ri-copyright-line"></i> {new Date().getFullYear()} Markdown转图片工具
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
