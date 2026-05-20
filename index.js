<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="https://i.imgur.com/sD1OnjL.png">
    <link rel="apple-touch-icon" href="https://i.imgur.com/sD1OnjL.png">
    <title>SAMU 192 - Sistema de Compra de Cargos</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        @keyframes flash {
            0%, 100% { background-color: #fee2e2; border-color: #fca5a5; } /* Red-100/Red-300 */
            50% { background-color: #dcfce7; border-color: #86efac; } /* Green-100/Green-300 */
        }
        .animate-flash {
            animation: flash 1.5s infinite ease-in-out;
        }
    </style>
</head>
<body class="bg-gray-100 font-sans min-h-screen flex flex-col">
    <div id="root" class="flex flex-col min-h-screen"></div>

    <script type="text/babel">
        const { useState, useEffect, useRef } = React;

        // --- Icons ---
        const Icon = ({ children, size = 24, className = "" }) => (
            <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                {children}
            </svg>
        );

        const Ambulance = (props) => <Icon {...props}><path d="M10 10H6" /><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14" /><path d="M8 8v4" /><path d="M9 18h6" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></Icon>;
        const Check = (props) => <Icon {...props}><path d="M20 6 9 17l-5-5" /></Icon>;
        const AlertCircle = (props) => <Icon {...props}><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></Icon>;
        const CheckCircle = (props) => <Icon {...props}><path d="M21.801 10A10 10 0 1 1 17 3.335" /><path d="m9 11 3 3L22 4" /></Icon>;
        const EyeOff = (props) => <Icon {...props}><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></Icon>;
        const Loader2 = (props) => <Icon {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></Icon>;
        const Edit2 = (props) => <Icon {...props}><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /></Icon>;
        const Tag = (props) => <Icon {...props}><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></Icon>;
        const AlertTriangle = (props) => <Icon {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></Icon>;
        const Upload = (props) => <Icon {...props}><path d="M12 3v12" /><path d="m17 8-5-5-5 5" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /></Icon>;
        const X = (props) => <Icon {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>;

        // --- Data ---
        const roles = [
            { id: 'neurologista', name: 'Neurologista Chefe', priceGame: 6830000, pricePix: 18.00, priceGameFormatted: 'R$ 6.830.000', pricePixFormatted: 'R$ 18,00' },
            { id: 'cirurgiao', name: 'Cirurgião Chefe', priceGame: 4434000, pricePix: 15.00, priceGameFormatted: 'R$ 4.434.000', pricePixFormatted: 'R$ 15,00' },
            { id: 'medico', name: 'Médico Chefe', priceGame: 3998000, pricePix: 13.00, priceGameFormatted: 'R$ 3.998.000', pricePixFormatted: 'R$ 13,00' },
            { id: 'enfermeiro', name: 'Enfermeiro Chefe', priceGame: 1894000, pricePix: 9.00, priceGameFormatted: 'R$ 1.894.000', pricePixFormatted: 'R$ 9,00' },
            { id: 'socorrista', name: 'Socorrista Chefe', priceGame: 1248000, pricePix: 6.00, priceGameFormatted: 'R$ 1.248.000', pricePixFormatted: 'R$ 6,00' }
        ];

        const PDF_LOGO_URL = "https://i.imgur.com/GMUqrvx.png";

        // --- Components ---
        const Header = () => (
            <header className="bg-red-600 text-white shadow-lg">
                <div className="container mx-auto px-4 py-6 flex items-center justify-center space-x-3">
                    <img src={PDF_LOGO_URL} alt="SAMU Logo" className="h-16 w-16 object-contain bg-white rounded-full p-1" />
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wider">SAMU 192</h1>
                        <p className="text-red-100 text-sm font-medium">SETOR FINANCEIRO DO SAMU</p>
                    </div>
                </div>
            </header>
        );

        const Footer = () => (
            <footer className="bg-gray-800 text-gray-400 py-6 mt-auto">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm">&copy; {new Date().getFullYear()} SAMU 192 - Todos os direitos reservados.</p>
                    <p className="text-xs mt-2 text-gray-500">Sistema exclusivo para uso interno e compra de cargos.</p>
                </div>
            </footer>
        );

        const ImageBlurrer = ({ file, onSave, onCancel }) => {
            const canvasRef = useRef(null);
            const [imageObj, setImageObj] = useState(null);
            const [canvasState, setCanvasState] = useState(null);
            const [isDrawing, setIsDrawing] = useState(false);
            const [startPos, setStartPos] = useState({ x: 0, y: 0 });
            const lastPos = useRef({ x: 0, y: 0 });

            useEffect(() => {
                const img = new Image();
                img.src = URL.createObjectURL(file);
                img.onload = () => {
                    setImageObj(img);
                };
                return () => URL.revokeObjectURL(img.src);
            }, [file]);

            useEffect(() => {
                if (imageObj && canvasRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');
                    canvas.width = imageObj.width;
                    canvas.height = imageObj.height;
                    ctx.drawImage(imageObj, 0, 0);
                    setCanvasState(ctx.getImageData(0, 0, canvas.width, canvas.height));
                }
            }, [imageObj]);

            const getPos = (e) => {
                const canvas = canvasRef.current;
                if (!canvas) return { x: 0, y: 0 };
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                let clientX, clientY;
                
                if (e.changedTouches && e.changedTouches.length > 0) {
                    clientX = e.changedTouches[0].clientX;
                    clientY = e.changedTouches[0].clientY;
                } else if (e.touches && e.touches.length > 0) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }
                
                return {
                    x: (clientX - rect.left) * scaleX,
                    y: (clientY - rect.top) * scaleY
                };
            };

            const startDrawing = (e) => {
                if (e.cancelable) e.preventDefault();
                setIsDrawing(true);
                const pos = getPos(e);
                setStartPos(pos);
                lastPos.current = pos;
            };

            const draw = (e) => {
                if (e.cancelable) e.preventDefault();
                if (!isDrawing || !canvasRef.current || !canvasState) return;
                
                const ctx = canvasRef.current.getContext('2d');
                const currentPos = getPos(e);
                lastPos.current = currentPos;
                
                const width = currentPos.x - startPos.x;
                const height = currentPos.y - startPos.y;
                
                ctx.putImageData(canvasState, 0, 0);
                
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.strokeStyle = 'red';
                ctx.lineWidth = Math.max(4, canvasRef.current.width * 0.005);
                
                ctx.fillRect(startPos.x, startPos.y, width, height);
                ctx.strokeRect(startPos.x, startPos.y, width, height);
            };

            const stopDrawing = (e) => {
                if (e.cancelable) e.preventDefault();
                if (!isDrawing || !canvasRef.current || !canvasState) return;
                setIsDrawing(false);
                
                const ctx = canvasRef.current.getContext('2d');
                let endPos = getPos(e);
                
                if ((e.type === 'touchend' || e.type === 'touchcancel') && (!e.changedTouches || e.changedTouches.length === 0)) {
                    endPos = lastPos.current;
                } else if (e.type === 'touchend' && e.changedTouches && e.changedTouches.length > 0) {
                     endPos = getPos(e);
                }

                const width = endPos.x - startPos.x;
                const height = endPos.y - startPos.y;
                
                if (Math.abs(width) < 1 && Math.abs(height) < 1) {
                    ctx.putImageData(canvasState, 0, 0);
                    return;
                }

                ctx.putImageData(canvasState, 0, 0);
                
                const absW = Math.abs(width);
                const absH = Math.abs(height);
                
                if (absW < 1 || absH < 1) return;

                const tempCanvas = document.createElement('canvas');
                const sampleSize = 20;
                tempCanvas.width = Math.max(1, Math.floor(absW / sampleSize));
                tempCanvas.height = Math.max(1, Math.floor(absH / sampleSize));
                
                const tCtx = tempCanvas.getContext('2d');
                tCtx.imageSmoothingEnabled = false;
                
                tCtx.drawImage(canvasRef.current, startPos.x, startPos.y, width, height, 0, 0, tempCanvas.width, tempCanvas.height);
                
                ctx.save();
                ctx.beginPath();
                ctx.rect(startPos.x, startPos.y, width, height);
                ctx.clip();
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, startPos.x, startPos.y, width, height);
                ctx.restore();
                
                setCanvasState(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
            };

            const handleSave = () => {
                if (canvasRef.current) {
                    canvasRef.current.toBlob((blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name, { type: file.type });
                            onSave(newFile);
                        }
                    }, file.type, 0.95);
                }
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-4 max-w-4xl w-full flex flex-col items-center max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between w-full mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center"><EyeOff className="mr-2 h-5 w-5 text-red-600" /> Ocultar Dados Pessoais</h3>
                            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700"><X /></button>
                        </div>
                        
                        <div className="w-full mb-4 p-4 rounded-lg border-2 animate-flash text-center">
                            <h4 className="font-bold text-red-800 text-lg mb-2 flex items-center justify-center">
                                <EyeOff className="w-6 h-6 mr-2" />
                                Ocultar Dados Pessoais
                            </h4>
                            <p className="text-sm text-gray-800 font-medium mb-2 hidden md:block">
                                Arraste o mouse sobre nomes e dados sensíveis para borrá-los.
                            </p>
                            <p className="text-sm text-gray-800 font-medium mb-2 md:hidden">
                                Toque e arraste o dedo sobre os dados para borrar.
                            </p>
                            <p className="text-xs text-red-700 font-bold uppercase">
                                Caso o comprovante mostre o nome do destinatário ou recebedor, a compra será cancelada automaticamente.
                            </p>
                        </div>

                        <div className="relative border-2 border-dashed border-gray-300 bg-gray-100 rounded overflow-hidden cursor-crosshair touch-none w-full flex justify-center">
                            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                        </div>
                        <div className="flex gap-4 mt-6 w-full justify-end">
                            <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"><Check className="mr-2 h-4 w-4" /> Confirmar Edição</button>
                        </div>
                    </div>
                </div>
            );
        };

        const CouponModal = ({ onApply, onClose }) => {
            const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

            useEffect(() => {
                if (timeLeft <= 0) {
                    onClose();
                    return;
                }
                const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
                return () => clearInterval(timer);
            }, [timeLeft, onClose]);

            const formatTime = (seconds) => {
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            };

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-bounce-in border-2 border-red-100">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4 animate-pulse">
                                <Tag className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Sua primeira compra?</h3>
                            <p className="text-gray-600 mb-6">
                                Tome um presente! Um cupom com <span className="font-bold text-red-600">5% de desconto</span> disponível por:
                            </p>
                            
                            <div className="text-4xl font-mono font-bold text-red-600 mb-8 tracking-wider bg-red-50 py-2 rounded-lg">
                                {formatTime(timeLeft)}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Não quero
                                </button>
                                <button
                                    onClick={onApply}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors shadow-lg shadow-red-200 flex items-center justify-center"
                                >
                                    <Check className="w-5 h-5 mr-2" />
                                    Vincular cupom
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const LandingPage = ({ onViewChange }) => {
            const API_URL = "https://apii-samu.onrender.com";
            const [patrulhamento, setPatrulhamento] = useState("--");
            const [online, setOnline] = useState("--");
            const [total, setTotal] = useState("--");
            const [publicacoes, setPublicacoes] = useState([]);
            const [membros, setMembros] = useState({});
            const [ultimoMembros, setUltimoMembros] = useState({});
            const [portalReady, setPortalReady] = useState(false);
            const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
            const loadingPhrases = [
                "Dica: Entre para o setor de recrutadores ou professores para receber mais.",
                "Venca o ranking de horas para ser funcionario da SEMANA."
            ];

            const carregarDadosPortal = async () => {
                try {
                    const res = await fetch(`${API_URL}/patrulhamento`);
                    const data = await res.json();
                    setPatrulhamento(data.total ?? "--");
                } catch {
                    setPatrulhamento("OFF");
                }

                try {
                    const res = await fetch(`${API_URL}/contador`);
                    const data = await res.json();
                    setOnline(data.online ?? "--");
                    setTotal(data.total ?? "--");
                } catch {
                    setOnline("OFF");
                    setTotal("--");
                }

                try {
                    const res = await fetch(`${API_URL}/publicacoes`);
                    const data = await res.json();
                    setPublicacoes(Array.isArray(data) ? data.slice(0, 2) : []);
                } catch {
                    setPublicacoes([]);
                }

                try {
                    const res = await fetch(`${API_URL}/membros`);
                    const data = await res.json();
                    if (data && typeof data === "object" && !data.erro) {
                        setMembros(data);
                        setUltimoMembros(data);
                        setPortalReady(true);
                    } else if (Object.keys(ultimoMembros).length > 0) {
                        setMembros(ultimoMembros);
                        setPortalReady(true);
                    }
                } catch {
                    if (Object.keys(ultimoMembros).length > 0) {
                        setMembros(ultimoMembros);
                        setPortalReady(true);
                    }
                }
            };

            useEffect(() => {
                carregarDadosPortal();
                const intervalo = setInterval(carregarDadosPortal, 30000);
                return () => clearInterval(intervalo);
            }, []);

            useEffect(() => {
                const intervalo = setInterval(() => {
                    setLoadingPhraseIndex(i => (i + 1) % loadingPhrases.length);
                }, 3500);
                return () => clearInterval(intervalo);
            }, []);

            const statusColor = (status) => {
                if (status === "online") return "bg-green-500";
                if (status === "idle") return "bg-yellow-400";
                if (status === "dnd") return "bg-red-500";
                return "bg-gray-400";
            };

            const destaqueCargos = ["Funcionario da Semana", "Recrutador Destaque", "Professor Destaque"];
            const destaqueIcons = {
                "Funcionario da Semana": "🏆",
                "Recrutador Destaque": "👑",
                "Professor Destaque": "🏅"
            };
            const membrosPresidenciais = Object.fromEntries(Object.entries(membros).filter(([cargo]) => !destaqueCargos.includes(cargo)));

            if (!portalReady) {
                return (
                    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
                        <div className="bg-white rounded-2xl shadow-xl border max-w-md w-full p-8 text-center">
                            <img src="https://i.imgur.com/sD1OnjL.png" alt="SAMU" className="w-24 h-24 mx-auto rounded-2xl object-contain mb-5" />
                            <h1 className="text-3xl font-black text-gray-900">SAMU 192</h1>
                            <p className="text-gray-500 mt-1">Carregando informacoes do servidor...</p>
                            <div className="mt-6 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full w-1/2 bg-red-600 rounded-full animate-pulse"></div>
                            </div>
                            <p className="mt-6 text-sm font-bold text-red-700 min-h-[44px]">{loadingPhrases[loadingPhraseIndex]}</p>
                        </div>
                    </div>
                );
            }

            return (
                <div className="bg-gray-100 text-gray-950 min-h-screen">
                    <button
                        type="button"
                        onClick={() => onViewChange('admin')}
                        className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl font-black text-sm hover:bg-red-600 transition border border-white/20"
                        title="Painel Admin"
                    >
                        Admin
                    </button>
                    <header className="bg-white/90 backdrop-blur border-b sticky top-0 z-50">
                        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-black leading-none">SAMU 192</h1>
                                <p className="text-xs text-gray-500 mt-1">Portal Oficial Interno</p>
                            </div>

                            <nav className="hidden md:flex gap-7 text-sm font-bold">
                                <a href="#inicio" className="hover:text-red-600 transition">Início</a>
                                <a href="#publicacoes" className="hover:text-red-600 transition">Publicações</a>
                                <a href="#membros" className="hover:text-red-600 transition">Membros</a>
                                <a href="#servicos" className="hover:text-red-600 transition">Serviços</a>
                            </nav>

                            <a href="https://discord.gg/vMydtZbPHJ" target="_blank" className="bg-black text-white px-5 py-3 rounded-xl font-black hover:bg-red-600 transition">
                                Acessar Discord
                            </a>
                        </div>
                    </header>

                    <main id="inicio" className="max-w-7xl mx-auto px-6 py-8">
                        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 via-red-600 to-red-500 p-8 md:p-12 shadow-xl text-white">
                            <div className="absolute -bottom-16 -left-12 w-40 h-40 bg-white/10 rounded-full"></div>
                            <div className="absolute -top-20 -right-12 w-48 h-48 bg-white/10 rounded-full"></div>

                            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
                                <div>
                                    <p className="tracking-[0.4em] text-xs font-black mb-5">PORTAL OFICIAL</p>

                                    <h2 className="text-5xl md:text-6xl font-black mb-5">SAMU 192</h2>

                                    <p className="text-lg max-w-xl leading-relaxed text-white/95">
                                        Acesse publicações oficiais, servidor do Discord, composição presidencial,
                                        serviços financeiros e métricas operacionais em tempo real.
                                    </p>

                                    <div className="flex flex-wrap gap-3 mt-8">
                                        <button type="button" onClick={() => onViewChange('buy-role')} className="bg-white text-red-700 px-6 py-3 rounded-xl font-black hover:scale-105 transition">
                                            Compra de Cargo
                                        </button>

                                        <button type="button" onClick={() => onViewChange('request-salary')} className="border border-white/40 px-6 py-3 rounded-xl font-black bg-white/5 text-white hover:bg-white/10 transition">
                                            Solicitar Salário
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white/10 border border-white/25 rounded-2xl p-6 backdrop-blur-sm">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-full bg-white text-red-600 flex items-center justify-center text-2xl">🚑</div>
                                        <div>
                                            <h3 className="text-xl font-black">Central do SAMU</h3>
                                            <p className="text-sm text-white/90">Números em tempo real</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="bg-white/15 rounded-xl p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                                                <p className="text-3xl font-black">{patrulhamento}</p>
                                            </div>
                                            <p className="text-sm text-white/90">em patrulhamento</p>
                                        </div>

                                        <div className="bg-white/15 rounded-xl p-4">
                                            <p className="text-3xl font-black">{online}</p>
                                            <p className="text-sm text-white/90">membros do SAMU online</p>
                                        </div>

                                        <div className="bg-white/15 rounded-xl p-4">
                                            <p className="text-3xl font-black">{total}</p>
                                            <p className="text-sm text-white/90">membros totais</p>
                                        </div>

                                        <div className="bg-white/15 rounded-xl p-4">
                                            <p className="text-3xl font-black">{publicacoes.length || "--"}</p>
                                            <p className="text-sm text-white/90">decretos exibidos</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section id="servicos" className="py-12">
                            <h3 className="text-3xl font-black mb-6">Serviços Internos</h3>

                            <div className="grid md:grid-cols-2 gap-6">
                                <button type="button" onClick={() => onViewChange('buy-role')} className="text-left bg-red-600 text-white rounded-3xl p-8 shadow-lg hover:scale-[1.02] transition">
                                    <h4 className="text-2xl font-black mb-2">Compra de Cargo</h4>
                                    <p className="text-red-100">Acesse o módulo financeiro para aquisição de cargo.</p>
                                </button>

                                <button type="button" onClick={() => onViewChange('request-salary')} className="text-left bg-white border rounded-3xl p-8 shadow-sm hover:scale-[1.02] transition">
                                    <h4 className="text-2xl font-black mb-2">Solicitar Salário</h4>
                                    <p className="text-gray-500">Solicite o pagamento conforme regras internas.</p>
                                </button>
                            </div>
                        </section>

                        <section id="membros" className="py-10">
                            <div className="flex items-end justify-between gap-4 mb-6">
                                <div>
                                    <p className="tracking-[0.35em] text-red-600 font-black text-xs mb-2">COMPOSIÇÃO OFICIAL</p>
                                    <h3 className="text-3xl font-black">Membros Presidenciais</h3>
                                </div>
                                <span className="hidden md:inline-flex bg-white border px-5 py-3 rounded-full text-sm font-bold text-gray-500">
                                    Atualização automática
                                </span>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                {destaqueCargos.map(cargo => {
                                    const membro = Array.isArray(membros[cargo]) ? membros[cargo][0] : null;
                                    return (
                                        <div key={cargo} className="bg-gray-900 text-white rounded-2xl p-4 shadow-sm border border-gray-800 min-h-[120px]">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{destaqueIcons[cargo]}</span>
                                                <div>
                                                    <h4 className="font-black leading-tight">{cargo}</h4>
                                                    <p className="text-xs text-gray-300">Destaque semanal</p>
                                                </div>
                                            </div>
                                            {membro ? (
                                                <div className="flex items-center gap-3 mt-4">
                                                    <div className="relative">
                                                        <img src={membro.avatar} className="w-12 h-12 rounded-full border-2 border-white object-cover" alt={membro.nome || cargo} />
                                                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${statusColor(membro.status)}`}></span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-sm truncate">{membro.nome || "Sem nome"}</p>
                                                        <p className="text-xs text-gray-300 truncate">{membro.username || cargo}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-300 mt-4">Aguardando definição.</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid lg:grid-cols-3 gap-5">
                                {Object.keys(membrosPresidenciais).length === 0 ? (
                                    <div className="bg-white border rounded-3xl p-6 shadow-sm lg:col-span-3">
                                        <p className="text-gray-500">Carregando membros do Discord...</p>
                                    </div>
                                ) : Object.keys(membrosPresidenciais).map(cargo => {
                                    const lista = Array.isArray(membrosPresidenciais[cargo]) ? membrosPresidenciais[cargo] : [];
                                    return (
                                        <div key={cargo} className="bg-white border rounded-3xl p-5 shadow-sm h-[255px]">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="text-xl font-black">{cargo}</h4>
                                                    <p className="text-sm text-gray-500">{lista.length} membro(s)</p>
                                                </div>
                                                <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-black">{lista.length}</span>
                                            </div>

                                            <div className="flex flex-wrap gap-5 max-h-[155px] overflow-y-auto pr-2 pb-1">
                                                {lista.map(membro => (
                                                    <div key={membro.id || membro.nome} className="flex flex-col items-center w-24">
                                                        <div className="relative">
                                                            <img src={membro.avatar} className="w-16 h-16 rounded-full border-4 border-white shadow-md object-cover" alt={membro.nome || "Membro"} />
                                                            <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${statusColor(membro.status)}`}></span>
                                                        </div>
                                                        <p className="font-black text-xs text-center mt-2 leading-tight line-clamp-2">{membro.nome || "Sem nome"}</p>
                                                        <p className="text-[11px] text-gray-500 text-center truncate max-w-[90px]">{membro.username || cargo}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section id="publicacoes" className="py-10">
                            <div className="flex items-end justify-between gap-4 mb-6">
                                <div>
                                    <p className="tracking-[0.35em] text-red-600 font-black text-xs mb-2">PUBLICAÇÕES</p>
                                    <h3 className="text-3xl font-black">Últimos Decretos</h3>
                                </div>
                                <span className="bg-white border px-5 py-3 rounded-full text-sm font-bold text-gray-500">Exibindo 2</span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                                {publicacoes.length === 0 ? (
                                    <div className="bg-white border rounded-3xl p-6 shadow-sm md:col-span-2">
                                        <p className="text-gray-500">Carregando decretos...</p>
                                    </div>
                                ) : publicacoes.map((pub, index) => (
                                    <article key={pub.id || index} className="bg-white border rounded-3xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3 mb-4">
                                            <img src={pub.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-10 h-10 rounded-full" alt={pub.autor || "Autor"} />
                                            <div>
                                                <p className="font-black">{pub.autor || "Sistema"}</p>
                                                <p className="text-xs text-gray-500">{pub.data || ""}</p>
                                            </div>
                                        </div>
                                        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed max-h-80 overflow-auto">{pub.conteudo || ""}</p>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </main>

                    <footer className="bg-white border-t mt-12">
                        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
                            © 2026 SAMU 192 — Portal institucional interno. Todos os direitos reservados. Este site e todo o seu conteúdo (incluindo textos, imagens, design, estrutura, layout, identidade visual e código-fonte) são protegidos pela Lei nº 9.610/1998 (Lei de Direitos Autorais) e demais legislações aplicáveis.
                        </div>
                    </footer>
                </div>
            );
        };

        const RoleForm = () => {
            const [formData, setFormData] = useState({ name: '', id: '', roleId: '', paymentMethod: 'ingame', coupon: '', sellerName: '' });
            const [proofImage, setProofImage] = useState(null);
            const [isEditingImage, setIsEditingImage] = useState(false);
            const [loading, setLoading] = useState(false);
            const [status, setStatus] = useState('idle');
            const [errorMessage, setErrorMessage] = useState('');
            const [discountType, setDiscountType] = useState(null); // null, 'FINANC20', 'WELCOME5'
            const [showCouponModal, setShowCouponModal] = useState(false);
            const [pixCopied, setPixCopied] = useState(false);

            // --- CONFIGURAÇÃO PIX E LOGO ---
            // Substitua as URLs abaixo pelas imagens reais (anexos)
            const pixQrCodeUrl = "https://i.imgur.com/qZzSMMb.jpeg"; 
            const pdfLogoUrl = "https://i.imgur.com/GMUqrvx.png";
            const pixKey = "financeirosamu295@gmail.com";
            // Se tiver o "Copia e Cola" (código grande), coloque aqui. Se não, deixe a chave.
            const pixCopyPasteCode = pixKey; 

            useEffect(() => {
                const timer = setTimeout(() => {
                    if (!discountType) {
                        setShowCouponModal(true);
                    }
                }, 60000);
                return () => clearTimeout(timer);
            }, [discountType]);

            const handleApplyCoupon = () => {
                setDiscountType('WELCOME5');
                setFormData(prev => ({ ...prev, coupon: 'PRESENTE5' }));
                setShowCouponModal(false);
            };

            const handleCopyPix = () => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(pixCopyPasteCode).then(() => {
                        setPixCopied(true);
                        setTimeout(() => setPixCopied(false), 2000);
                    }).catch(err => {
                        console.error('Clipboard failed', err);
                        fallbackCopy(pixCopyPasteCode);
                    });
                } else {
                    fallbackCopy(pixCopyPasteCode);
                }
            };

            const fallbackCopy = (text) => {
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = text;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    setPixCopied(true);
                    setTimeout(() => setPixCopied(false), 2000);
                } catch (err) {
                    console.error('Fallback failed', err);
                    alert('Não foi possível copiar. Por favor, copie manualmente: ' + text);
                }
            };

            const selectedRole = roles.find(r => r.id === formData.roleId);

            const getPrice = () => {
                if (!selectedRole) return { game: 0, pix: 0, gameFmt: '', pixFmt: '' };
                let game = selectedRole.priceGame;
                let pix = selectedRole.pricePix;
                
                if (discountType === 'FINANC20') {
                    game = game * 0.8;
                    pix = pix * 0.8;
                } else if (discountType === 'WELCOME5') {
                    game = game * 0.95;
                    pix = pix * 0.95;
                }

                return {
                    game, pix,
                    gameFmt: game.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace('R$', 'R$ '),
                    pixFmt: pix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace('R$', 'R$ ')
                };
            };
            const prices = getPrice();

            const handleInputChange = (e) => {
                const { name, value } = e.target;
                setFormData(prev => ({ ...prev, [name]: value }));
                if (name === 'coupon') {
                    if (value.toUpperCase() === 'FINANC20') setDiscountType('FINANC20');
                    else if (value.toUpperCase() === 'PRESENTE5') setDiscountType('WELCOME5');
                    else setDiscountType(null);
                }
            };

            const handleFileChange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    setProofImage(e.target.files[0]);
                    if (formData.paymentMethod === 'pix') setIsEditingImage(true);
                }
            };

            const handleImageSave = (file) => { setProofImage(file); setIsEditingImage(false); };

            const sendToDiscord = async (blob, filename) => {
                const webhookUrl = "https://discord.com/api/webhooks/1462986317041373360/Dcw3RwuGHbWeWQLL2yqfNQ08_TNa1gmPCBCRUuzGZPxzD4iUj3A_zCEknah1TjEamzSU";
                const formData = new FormData();
                formData.append("file", blob, filename);
                formData.append("payload_json", JSON.stringify({
                    content: "Comprovante Gerado"
                }));

                try {
                    const response = await fetch(webhookUrl, {
                        method: "POST",
                        body: formData
                    });
                    if (!response.ok) {
                        const responseText = await response.text();
                        throw new Error(`HTTP ${response.status}: ${responseText}`);
                    }
                } catch (error) {
                    console.error("Erro ao enviar para o Discord:", error);
                    alert("Falha no envio para o Discord: " + error.message);
                }
            };

            const generateReceipt = async () => {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();

                    // --- Page Border ---
                    doc.setDrawColor(220, 38, 38); // Red-600
                    doc.setLineWidth(0.5);
                    doc.rect(10, 10, 190, 277);
                    doc.setDrawColor(0);
                    doc.setLineWidth(0.1);

                    // --- Header Background ---
                    doc.setFillColor(249, 250, 251); // Gray-50
                    doc.rect(11, 11, 188, 50, 'F');

                    // Logo
                    const logoUrl = pdfLogoUrl;
                    try {
                        const img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.src = logoUrl;
                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                        });
                        const aspect = img.width / img.height;
                        doc.addImage(img, 'PNG', 20, 15, 30, 30 / aspect);
                    } catch (e) {
                        console.warn("Logo load failed", e);
                        doc.setFontSize(22);
                        doc.setTextColor(220, 38, 38);
                        doc.text("SAMU 192", 35, 30, { align: 'center' });
                    }

                    // Company Info
                    doc.setTextColor(0);
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("SAMU 192 - SETOR FINANCEIRO", 180, 25, { align: 'right' });
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.text("Sistema de Gestão de Cargos e Salários", 180, 30, { align: 'right' });
                    doc.text("Desde 2023 servindo a comunidade", 180, 34, { align: 'right' });

                    // Title & ID
                    doc.setFontSize(16);
                    doc.setTextColor(220, 38, 38);
                    doc.setFont("helvetica", "bold");
                    doc.text("COMPROVANTE DE PAGAMENTO", 105, 75, { align: 'center' });

                    let seq = localStorage.getItem('samu_receipt_seq') || '0';
                    seq = parseInt(seq) + 1;
                    localStorage.setItem('samu_receipt_seq', seq.toString());
                    const receiptId = `####${seq.toString().padStart(5, '0')}`;

                    doc.setFontSize(10);
                    doc.setTextColor(100);
                    doc.text(`N? DOCUMENTO: ${receiptId}`, 105, 82, { align: 'center' });

                    // --- Table Header ---
                    let y = 95;
                    doc.setFillColor(220, 38, 38);
                    doc.rect(20, y, 170, 8, 'F');
                    doc.setTextColor(255);
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text("DESCRIÇÃO DOS DETALHES", 25, y + 5.5);
                    doc.text("INFORMAÇÃO", 95, y + 5.5);

                    // --- Table Content ---
                    doc.setTextColor(0);
                    doc.setFont("helvetica", "normal");
                    y += 8;

                    const addTableRow = (label, value, isLast = false) => {
                        doc.setDrawColor(230);
                        doc.line(20, y, 190, y);
                        doc.setFont("helvetica", "bold");
                        doc.text(label, 25, y + 6);
                        doc.setFont("helvetica", "normal");
                        doc.text(String(value), 95, y + 6);
                        y += 10;
                        if (isLast) {
                            doc.line(20, y, 190, y);
                        }
                    };

                    const paymentLabel = formData.paymentMethod === 'ingame' ? 'In-Game' : 'PIX';
                    const valuePaid = formData.paymentMethod === 'ingame' ? prices.gameFmt : prices.pixFmt;
                    
                    const rawValue = formData.paymentMethod === 'ingame' ? prices.game : prices.pix;
                    const commission = rawValue * 0.30;
                    const profit = rawValue - commission;
                    const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', 'R$ ');

                    addTableRow("Nome do Membro:", formData.name);
                    addTableRow("ID do Passaporte:", formData.id);
                    addTableRow("Cargo Comprado:", selectedRole.name);
                    addTableRow("Vendedor:", formData.sellerName);
                    addTableRow("Data da Compra:", new Date().toLocaleString('pt-BR'));
                    addTableRow("Forma de Pagamento:", paymentLabel);
                    addTableRow("Cupom Aplicado:", discountType === 'FINANC20' ? 'FINANC20 (-20%)' : discountType === 'WELCOME5' ? 'PRESENTE5 (-5%)' : 'Nenhum');
                    
                    // Totals Section
                    y += 5;
                    doc.setFillColor(249, 250, 251);
                    doc.rect(110, y, 80, 30, 'F');
                    doc.setDrawColor(200);
                    doc.rect(110, y, 80, 30);
                    
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "normal");
                    doc.text("Subtotal:", 115, y + 8);
                    doc.text(valuePaid, 185, y + 8, { align: 'right' });
                    
                    doc.text("Comissão Vendedor (30%):", 115, y + 16);
                    doc.text(`-${formatCurrency(commission)}`, 185, y + 16, { align: 'right' });
                    
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.setTextColor(220, 38, 38);
                    doc.text("LUCRO SAMU:", 115, y + 25);
                    doc.text(formatCurrency(profit), 185, y + 25, { align: 'right' });

                    // Footer
                    y = 240;
                    doc.setDrawColor(200);
                    doc.line(20, y, 190, y);
                    y += 10;
                    
                    doc.setFontSize(10);
                    doc.setTextColor(220, 38, 38);
                    doc.setFont("helvetica", "bold");
                    doc.text("INFORMAÇÕES IMPORTANTES:", 20, y);
                    y += 6;
                    doc.setTextColor(0);
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.text("⬢ Apresente este comprovante no ticket financeiro do Discord do SAMU para validação.", 20, y);
                    
                    y += 10;
                    doc.setFontSize(9);
                    doc.setTextColor(0, 100, 0); // Dark Green
                    doc.setFont("helvetica", "bold");
                    doc.text("CAMPANHA DE INDICAÇÃO:", 20, y);
                    y += 5;
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    const promoText = "Indique um amigo para comprar cargo e seja promovido um cargo e receba R$500.000 (campanha de promoção válida até o cargo de neurologista-chefe), o valor a receber é livre.";
                    const splitPromo = doc.splitTextToSize(promoText, 170);
                    doc.text(splitPromo, 20, y);

                    // Extra Footer
                    y = 275;
                    doc.setFontSize(7);
                    doc.setTextColor(150);
                    doc.setFont("helvetica", "italic");
                    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Autenticação: ${Math.random().toString(36).substring(2, 15).toUpperCase()}`, 105, y, { align: 'center' });

                    const pdfBlob = doc.output('blob');
                    doc.save(`comprovante_samu_${formData.id}.pdf`);
                    
                    try {
                        await sendToDiscord(pdfBlob, `comprovante_samu_${formData.id}.pdf`);
                        alert("Comprovante Gerado");
                    } catch (e) {
                        console.error("Erro ao enviar para Discord", e);
                        alert("Comprovante Gerado");
                    }
                } catch (err) {
                    console.error("Erro ao gerar PDF", err);
                    alert("Erro ao gerar comprovante PDF. Verifique se os pop-ups estão permitidos.");
                }
            };

            const handleSubmit = async (e) => {
                e.preventDefault();
                setLoading(true); setStatus('idle'); setErrorMessage('');
                if (!selectedRole) { setErrorMessage('Por favor, selecione um cargo.'); setLoading(false); return; }
                if (!proofImage) { setErrorMessage('O comprovante é obrigatório.'); setLoading(false); return; }
                if (!formData.sellerName) { setErrorMessage('O nome do vendedor é obrigatório.'); setLoading(false); return; }

                const webhookUrl = 'https://discord.com/api/webhooks/1448491990554775635/aJefNMEFjz-j2LHFbu9VkRS5qtvZN6L5zsecGdH9FIbBp2JSg7G6YYc36igDzjKbzYye';
                const paymentLabel = formData.paymentMethod === 'ingame' ? 'In-Game' : 'PIX';
                const valuePaid = formData.paymentMethod === 'ingame' ? prices.gameFmt : prices.pixFmt;
                
                // Cálculo de comissão e lucro
                const rawValue = formData.paymentMethod === 'ingame' ? prices.game : prices.pix;
                const commission = rawValue * 0.30;
                const profit = rawValue - commission;
                
                const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', 'R$ ');
                const commissionFmt = formatCurrency(commission);
                const profitFmt = formatCurrency(profit);

                const messageContent = `<@&1297725684914847795>\n\n` +
                    `**NOVA COMPRA DE CARGO**\n\n` +
                    `**Nome do Membro:** ${formData.name}\n` +
                    `**ID:** ${formData.id}\n` +
                    `**Cargo Comprado:** ${selectedRole.name}\n` +
                    `**Vendedor:** ${formData.sellerName}\n` +
                    `**Data e Horário:** ${new Date().toLocaleString('pt-BR')}\n` +
                    `**Valor Pago:** ${valuePaid}\n` +
                    `**Comissão do Vendedor:** ${commissionFmt}\n` +
                    `**Lucro do SAMU:** ${profitFmt}\n` +
                    `**Forma de Pagamento:** ${paymentLabel}\n` +
                    `**Cupom:** ${discountType === 'FINANC20' ? 'Sim (FINANC20)' : discountType === 'WELCOME5' ? 'Sim (PRESENTE5)' : 'Não'}`;

                // TODO: Implementar envio de e-mail para gabryeljdd@gmail.com
                // Requer backend (Youbase) para envio seguro.

                const data = new FormData();
                data.append('content', messageContent);
                data.append('file', proofImage);

                try {
                    const response = await fetch(webhookUrl, { method: 'POST', body: data });
                    if (response.ok) {
                        setStatus('success');
                        generateReceipt(); // Gerar PDF
                        setFormData({ name: '', id: '', roleId: '', paymentMethod: 'ingame', coupon: '', sellerName: '' });
                        setProofImage(null);
                        setDiscountType(null);
                    } else throw new Error('Falha ao enviar para o Discord');
                } catch (error) {
                    console.error('Erro:', error);
                    setStatus('error');
                    setErrorMessage('Ocorreu um erro ao enviar o formulário. Tente novamente.');
                } finally { setLoading(false); }
            };

            return (
                <React.Fragment>
                    {showCouponModal && <CouponModal onApply={handleApplyCoupon} onClose={() => setShowCouponModal(false)} />}
                    {isEditingImage && proofImage && <ImageBlurrer file={proofImage} onSave={handleImageSave} onCancel={() => setIsEditingImage(false)} />}
                    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-3xl my-8 border border-gray-100">
                        <div className="bg-yellow-50 border-b border-yellow-100 p-4 flex items-start">
                            <AlertTriangle className="text-yellow-600 h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                            <p className="text-sm text-yellow-800"><strong>Atenção:</strong> Esta compra é considerada uma doação ao <strong>SAMU</strong>, no jogo online GTA San Andreas RP MTA.</p>
                        </div>
                        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-800">Formulário de Aquisição</h2>
                            <p className="text-gray-500 mt-1">Preencha os dados abaixo para solicitar seu cargo.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Membro</label>
                                    <input type="text" id="name" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="Seu nome no jogo" />
                                </div>
                                <div>
                                    <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">ID do Passaporte</label>
                                    <input type="text" id="id" name="id" required value={formData.id} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="Ex: 12345" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="roleId" className="block text-sm font-medium text-gray-700 mb-1">Cargo Desejado</label>
                                <select id="roleId" name="roleId" required value={formData.roleId} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors bg-white">
                                    <option value="">Selecione um cargo...</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name} (In-Game: {role.priceGameFormatted} | Pix: {role.pricePixFormatted})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="sellerName" className="block text-sm font-medium text-gray-700 mb-1">Nome do Vendedor que te atendeu</label>
                                <input type="text" id="sellerName" name="sellerName" required value={formData.sellerName} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors" placeholder="Nome do vendedor" />
                            </div>
                            <div>
                                <span className="block text-sm font-medium text-gray-700 mb-3">Forma de Pagamento</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'ingame' ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 hover:border-red-200'}`}>
                                        <input type="radio" name="paymentMethod" value="ingame" checked={formData.paymentMethod === 'ingame'} onChange={handleInputChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300" />
                                        <div className="ml-3"><span className="block text-sm font-medium text-gray-900">Dinheiro In-Game</span><span className="block text-xs text-gray-500">Pagamento dentro da cidade</span></div>
                                    </label>
                                    <label className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'pix' ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 hover:border-red-200'}`}>
                                        <input type="radio" name="paymentMethod" value="pix" checked={formData.paymentMethod === 'pix'} onChange={handleInputChange} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300" />
                                        <div className="ml-3"><span className="block text-sm font-medium text-gray-900">PIX</span><span className="block text-xs text-gray-500">Transferência instantânea</span></div>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="coupon" className="block text-sm font-medium text-gray-700 mb-1">Cupom de Desconto</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Tag className="h-5 w-5 text-gray-400" /></div>
                                    <input type="text" id="coupon" name="coupon" value={formData.coupon} onChange={handleInputChange} className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition-colors ${discountType ? 'border-green-500 ring-1 ring-green-500 bg-green-50' : 'border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'}`} placeholder="Possui um cupom?" />
                                    {discountType === 'FINANC20' && <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-green-600 font-medium">-20% Aplicado!</span>}
                                    {discountType === 'WELCOME5' && <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-green-600 font-medium">-5% Aplicado!</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Apenas um cupom pode ser aplicado por compra.</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                {selectedRole && (
                                    <div className="mb-4 pb-4 border-b border-gray-200">
                                        <p className="text-sm text-gray-600">Valor a pagar:</p>
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-2xl font-bold text-red-600">{formData.paymentMethod === 'ingame' ? prices.gameFmt : prices.pixFmt}</p>
                                            {discountType && <p className="text-sm text-gray-400 line-through">{formData.paymentMethod === 'ingame' ? selectedRole.priceGameFormatted : selectedRole.pricePixFormatted}</p>}
                                        </div>
                                    </div>
                                )}
                                {formData.paymentMethod === 'pix' && (
                                    <div className="mb-6 bg-white p-6 rounded-xl border border-blue-100 bg-blue-50 shadow-sm">
                                        <div className="flex flex-col md:flex-row items-center gap-6">
                                            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                                                <img src={pixQrCodeUrl} alt="QR Code PIX" className="w-48 h-48 object-contain" />
                                            </div>
                                            <div className="flex-1 w-full text-center md:text-left">
                                                <p className="text-sm font-bold text-blue-800 mb-2 uppercase tracking-wide">Pagamento via PIX</p>
                                                <div className="mb-4">
                                                    <p className="text-xs text-blue-600 mb-1">Chave PIX (E-mail):</p>
                                                    <p className="text-lg font-mono text-blue-900 font-bold break-all">{pixKey}</p>
                                                </div>
                                                
                                                <button 
                                                    type="button" 
                                                    onClick={handleCopyPix}
                                                    className={`w-full md:w-auto flex items-center justify-center px-6 py-3 rounded-lg font-bold transition-all transform active:scale-95 ${pixCopied ? 'bg-green-500 text-white shadow-green-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'} shadow-lg mx-auto md:mx-0`}
                                                >
                                                    {pixCopied ? (
                                                        <React.Fragment><CheckCircle className="w-5 h-5 mr-2" /> Copiado!</React.Fragment>
                                                    ) : (
                                                        <React.Fragment>
                                                            <Icon className="w-5 h-5 mr-2">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                            </Icon> 
                                                            Copiar Código PIX
                                                        </React.Fragment>
                                                    )}
                                                </button>
                                                <p className="text-xs text-blue-600 mt-4">
                                                    1. Abra o app do seu banco<br/>
                                                    2. Escolha "Pagar com Pix"<br/>
                                                    3. Escaneie o QR Code ou use "Copia e Cola"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Comprovante de Pagamento {formData.paymentMethod === 'ingame' ? '(Foto)' : '(Print)'}</label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-red-400 transition-colors bg-white">
                                        <div className="space-y-1 text-center">
                                            {proofImage ? (
                                                <div className="flex flex-col items-center">
                                                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                                                    <p className="mt-2 text-sm text-gray-900 font-medium">{proofImage.name}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        {formData.paymentMethod === 'pix' && (
                                                            <button type="button" onClick={() => setIsEditingImage(true)} className="text-xs flex items-center text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded"><Edit2 className="w-3 h-3 mr-1" /> Editar / Borrar Dados</button>
                                                        )}
                                                        <button type="button" onClick={() => setProofImage(null)} className="text-xs text-red-600 hover:text-red-800 font-medium bg-red-50 px-2 py-1 rounded">Remover</button>
                                                    </div>
                                                    {formData.paymentMethod === 'pix' && (
                                                        <div className="mt-4 p-4 rounded-lg border-2 animate-flash text-center">
                                                            <h4 className="font-bold text-red-800 text-lg mb-2 flex items-center justify-center">
                                                                <EyeOff className="w-6 h-6 mr-2" />
                                                                Ocultar Dados Pessoais
                                                            </h4>
                                                            <p className="text-sm text-gray-800 font-medium mb-2">
                                                                Arraste o mouse sobre nomes e dados sensíveis para borrá-los. Mantenha visível apenas o valor e a data.
                                                            </p>
                                                            <p className="text-xs text-red-700 font-bold uppercase">
                                                                Caso o comprovante mostre o nome do destinatário ou recebedor, a compra será cancelada automaticamente. Trabalhamos para proteger suas informações.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <React.Fragment>
                                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="flex text-sm text-gray-600 justify-center">
                                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none">
                                                            <span>Fazer upload de um arquivo</span>
                                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} required />
                                                        </label>
                                                        <p className="pl-1">ou arraste e solte</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500">PNG, JPG, GIF até 10MB</p>
                                                </React.Fragment>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {status === 'error' && <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700"><AlertCircle className="h-5 w-5 mr-2" /><span>{errorMessage}</span></div>}
                            {status === 'success' && <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700"><CheckCircle className="h-5 w-5 mr-2" /><span>Solicitação enviada com sucesso! Aguarde a aprovação.</span></div>}
                            <button type="submit" disabled={loading} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}>
                                {loading ? <React.Fragment><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Enviando...</React.Fragment> : 'Enviar Solicitação'}
                            </button>
                        </form>
                    </div>
                </React.Fragment>
            );
        };

        const salaryRoles = [
            { name: 'Presidente', value: 4025000, mandatoryMeta: true },
            { name: 'Vice-Presidente', value: 3450000, mandatoryMeta: true },
            { name: 'Diretor', value: 2875000, mandatoryMeta: true },
            { name: 'SubDiretor', value: 2300000, mandatoryMeta: true },
            { name: 'Coordenador-Geral', value: 1725000, mandatoryMeta: true },
            { name: 'Coordenador', value: 1380000, mandatoryMeta: true },
            { name: 'Neurologista Chefe', value: 1265000, mandatoryMeta: true },
            { name: 'Neurologista', value: 1150000, mandatoryMeta: true },
            { name: 'Cirurgião Chefe', value: 1138500, mandatoryMeta: true },
            { name: 'Cirurgião Residente', value: 1127000, mandatoryMeta: true },
            { name: 'Médico Chefe', value: 1115500, mandatoryMeta: true },
            { name: 'Médico Residente', value: 1092500, mandatoryMeta: false },
            { name: 'Médico Auxiliar', value: 1035000, mandatoryMeta: false },
            { name: 'Médico Estagiário', value: 977500, mandatoryMeta: false },
            { name: 'Enfermeiro Chefe', value: 920000, mandatoryMeta: false },
            { name: 'Enfermeiro', value: 862500, mandatoryMeta: false },
            { name: 'Técnico em Enfermagem', value: 805000, mandatoryMeta: false },
            { name: 'Estagiário de Enfermagem', value: 747500, mandatoryMeta: false },
            { name: 'Socorrista Chefe', value: 690000, mandatoryMeta: false },
            { name: 'Socorrista', value: 644000, mandatoryMeta: false },
            { name: 'Estagiário Socorrista', value: 609500, mandatoryMeta: false },
            { name: 'Recruta', value: 586500, mandatoryMeta: false },
            { name: 'Aprendiz', value: 569250, mandatoryMeta: false }
        ];

        const numeroPorExtenso = (v) => {
            if (!v) return "";
            v = Math.round(v);
            if (v === 0) return "zero reais";
            
            const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
            const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
            const d10 = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
            const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
            
            const getGroup = (n) => {
                let u = n % 10;
                let d = Math.floor((n % 100) / 10);
                let c = Math.floor(n / 100);
                let str = "";
                
                if (c > 0) {
                    if (n === 100) return "cem";
                    str += centenas[c];
                }
                
                if (d > 0 || u > 0) {
                    if (str) str += " e ";
                    if (d === 1) {
                        str += d10[u];
                    } else {
                        if (d > 0) str += dezenas[d];
                        if (d > 0 && u > 0) str += " e ";
                        if (u > 0) str += unidades[u];
                    }
                }
                return str;
            };
            
            let str = "";
            let groups = [];
            let temp = v;
            
            while (temp > 0) {
                groups.push(temp % 1000);
                temp = Math.floor(temp / 1000);
            }
            
            const names = ["", "mil", "milhões", "bilhões"];
            
            for (let i = groups.length - 1; i >= 0; i--) {
                let g = groups[i];
                if (g === 0) continue;
                
                let gStr = getGroup(g);
                let suffix = names[i];
                
                if (i === 1 && g === 1) { // 1000 -> mil (not um mil)
                    gStr = "";
                }
                
                if (i > 1 && g === 1) { // 1 milhão (singular)
                    suffix = suffix.replace("?es", "?o");
                }
                
                if (str) {
                     if (g < 100 || (g % 100 === 0)) str += " e ";
                     else str += ", ";
                }
                
                str += gStr + (gStr && suffix ? " " : "") + suffix;
            }
            
            return str + " reais";
        };

        const SalaryForm = () => {
            const formatDateInput = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            const getPaymentWeekRange = () => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const monday = new Date(today);
                const dayOfWeek = today.getDay();
                monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                const saturday = new Date(monday);
                saturday.setDate(monday.getDate() + 5);
                const minDate = today > monday ? today : monday;
                return { min: formatDateInput(minDate), max: formatDateInput(saturday) };
            };
            const paymentWeek = getPaymentWeekRange();
            const [formData, setFormData] = useState({ 
                name: '', id: '', discordId: '', roleIndex: '', 
                shift: 'noite', time: '', day: paymentWeek.min,
                companyPayment: '', otherPaymentName: '', otherPaymentValue: '' 
            });
            const [showOthers, setShowOthers] = useState(false);
            const [showMetaConfirmation, setShowMetaConfirmation] = useState(false);
            const [loading, setLoading] = useState(false);
            const [status, setStatus] = useState('idle');
            const [errorMessage, setErrorMessage] = useState('');
            const [salaryFines, setSalaryFines] = useState([]);
            const [loadingFines, setLoadingFines] = useState(false);

            const handleInputChange = (e) => {
                const { name, value } = e.target;
                const cleanValue = name === 'id' ? value.split(' ').join('') : value;
                setFormData(prev => ({ ...prev, [name]: cleanValue }));
            };

            const handleCurrencyInput = (e) => {
                let value = e.target.value.replace(/\D/g, "");
                if (value === "") {
                    setFormData(prev => ({ ...prev, [e.target.name]: "" }));
                    return;
                }
                const intValue = parseInt(value, 10);
                const formatted = intValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace('R$', 'R$ ');
                setFormData(prev => ({ ...prev, [e.target.name]: formatted }));
            };

            const parseCurrency = (value) => {
                if (!value) return 0;
                if (typeof value === 'number') return value;
                return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            };

            const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace('R$', 'R$ ');

            useEffect(() => {
                const cleanId = formData.id.split(' ').join('').trim();

                if (!cleanId) {
                    setSalaryFines([]);
                    return;
                }

                let active = true;
                const timer = setTimeout(async () => {
                    setLoadingFines(true);
                    try {
                        const response = await fetch(`https://apii-samu.onrender.com/multas/${encodeURIComponent(cleanId)}?status=pendente`);
                        const data = await response.json();
                        if (active) setSalaryFines(Array.isArray(data) ? data : []);
                    } catch (err) {
                        if (active) setSalaryFines([]);
                    } finally {
                        if (active) setLoadingFines(false);
                    }
                }, 350);

                return () => {
                    active = false;
                    clearTimeout(timer);
                };
            }, [formData.id]);

            const generateSalaryReceipt = async () => {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();

                    // --- Page Border ---
                    doc.setDrawColor(37, 99, 235); // Blue-600
                    doc.setLineWidth(0.5);
                    doc.rect(10, 10, 190, 277);
                    doc.setDrawColor(0);
                    doc.setLineWidth(0.1);

                    // --- Header Background ---
                    doc.setFillColor(240, 249, 255); // Blue-50
                    doc.rect(11, 11, 188, 50, 'F');

                    // Logo
                    try {
                        const img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.src = PDF_LOGO_URL;
                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                        });
                        const aspect = img.width / img.height;
                        doc.addImage(img, 'PNG', 20, 15, 30, 30 / aspect);
                    } catch (e) {
                        console.warn("Logo load failed", e);
                        doc.setFontSize(22);
                        doc.setTextColor(37, 99, 235);
                        doc.text("SAMU 192", 35, 30, { align: 'center' });
                    }

                    // Company Info
                    doc.setTextColor(0);
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("SAMU 192 - SETOR FINANCEIRO", 180, 25, { align: 'right' });
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.text("Solicitação de Pagamento de Salário", 180, 30, { align: 'right' });
                    doc.text("Desde 2023 servindo a comunidade", 180, 34, { align: 'right' });

                    // Title & ID
                    doc.setFontSize(14);
                    doc.setTextColor(37, 99, 235);
                    doc.setFont("helvetica", "bold");
                    doc.text("COMPROVANTE DE SOLICITAÇÃO DE SALÁRIO", 105, 75, { align: 'center' });

                    const receiptId = `SAL-${Date.now().toString().slice(-6)}`;
                    doc.setFontSize(10);
                    doc.setTextColor(100);
                    doc.text(`REF: ${receiptId}`, 105, 82, { align: 'center' });

                    // --- Table Header ---
                    let y = 95;
                    doc.setFillColor(37, 99, 235);
                    doc.rect(20, y, 170, 8, 'F');
                    doc.setTextColor(255);
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text("DESCRIÇÃO DO ITEM", 25, y + 5.5);
                    doc.text("VALOR / INFORMAÇÃO", 95, y + 5.5);

                    // --- Table Content ---
                    doc.setTextColor(0);
                    doc.setFont("helvetica", "normal");
                    y += 8;

                    const addTableRow = (label, value) => {
                        doc.setDrawColor(230);
                        doc.line(20, y, 190, y);
                        doc.setFont("helvetica", "bold");
                        doc.text(label, 25, y + 6);
                        doc.setFont("helvetica", "normal");
                        doc.text(String(value), 95, y + 6);
                        y += 10;
                    };

                    const role = salaryRoles[formData.roleIndex];
                    const baseSalary = role.value;
                    const companyVal = parseCurrency(formData.companyPayment);
                    const otherVal = parseCurrency(formData.otherPaymentValue);
                    const total = baseSalary + companyVal + otherVal;
                    const commissionVal = total * 0.10;
                    const subtotal = total - commissionVal;
                    const superTaxVal = subtotal > 5000000 ? subtotal * 0.07 : 0;
                    const netBeforeFines = subtotal - superTaxVal;
                    const finesTotal = salaryFines.reduce((sum, fine) => sum + parseCurrency(fine.valor), 0);
                    const finesDiscount = Math.min(netBeforeFines, finesTotal);
                    const finesRemaining = Math.max(finesTotal - finesDiscount, 0);
                    const net = Math.max(netBeforeFines - finesDiscount, 0);

                    addTableRow("Nome do Colaborador:", formData.name);
                    addTableRow("ID do Passaporte:", formData.id);
                    addTableRow("Cargo Atual:", role.name);
                    addTableRow("Salário Base:", formatCurrency(baseSalary));
                    if (companyVal > 0) addTableRow("Pagamento Companhias:", formatCurrency(companyVal));
                    if (otherVal > 0) addTableRow(`Outros (${formData.otherPaymentName}):`, formatCurrency(otherVal));
                    salaryFines.forEach((fine) => addTableRow(`Multa - ${fine.motivo || "Sem motivo"}:`, `-${formatCurrency(parseCurrency(fine.valor))}`));
                    if (finesRemaining > 0) addTableRow("Multa restante pendente:", formatCurrency(finesRemaining));
                    addTableRow("Dia do Recebimento:", formData.day.toUpperCase());
                    addTableRow("Turno / Horário:", `${formData.shift.toUpperCase()} ?s ${formData.time}`);

                    // Totals Section
                    y += 5;
                    doc.setFillColor(249, 250, 251);
                    doc.rect(110, y, 80, 45, 'F');
                    doc.setDrawColor(200);
                    doc.rect(110, y, 80, 45);
                    
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "normal");
                    doc.text("Salário Bruto:", 115, y + 8);
                    doc.text(formatCurrency(total), 185, y + 8, { align: 'right' });
                    
                    doc.text("Taxa Financeiro (10%):", 115, y + 16);
                    doc.text(`-${formatCurrency(commissionVal)}`, 185, y + 16, { align: 'right' });
                    
                    if (superTaxVal > 0) {
                        doc.text("Imposto Super Salário (7%):", 115, y + 24);
                        doc.text(`-${formatCurrency(superTaxVal)}`, 185, y + 24, { align: 'right' });
                    }
                    
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.setTextColor(37, 99, 235);
                    doc.text("VALOR LÍQUIDO:", 115, y + 35);
                    doc.text(formatCurrency(net), 185, y + 35, { align: 'right' });
                    
                    doc.setFontSize(7);
                    doc.setTextColor(100);
                    const ext = numeroPorExtenso(net);
                    const extFormatted = ext ? ext.charAt(0).toUpperCase() + ext.slice(1) : '';
                    doc.text(`(${extFormatted})`, 115, y + 40);

                    // Footer
                    y = 240;
                    doc.setDrawColor(200);
                    doc.line(20, y, 190, y);
                    y += 10;
                    
                    doc.setFontSize(10);
                    doc.setTextColor(37, 99, 235);
                    doc.setFont("helvetica", "bold");
                    doc.text("ORIENTAÇÕES AO COLABORADOR:", 20, y);
                    y += 6;
                    doc.setTextColor(0);
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.text("⬢ Membros acima de Médico-Chefe devem estar com a meta financeira semanal em dia (R$ 500.000).", 20, y);
                    y += 4;
                    doc.text("⬢ Este comprovante deve ser apresentado no canal de pagamentos do Discord.", 20, y);
                    
                    y += 10;
                    doc.setFontSize(9);
                    doc.setTextColor(0, 100, 0); // Dark Green
                    doc.setFont("helvetica", "bold");
                    doc.text("CAMPANHA DE INDICAÇÃO:", 20, y);
                    y += 5;
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    const promoText = "Indique um amigo para comprar cargo e seja promovido um cargo e receba R$500.000 (campanha de promoção válida até o cargo de neurologista-chefe), o valor a receber é livre.";
                    const splitPromo = doc.splitTextToSize(promoText, 170);
                    doc.text(splitPromo, 20, y);

                    // Extra Footer
                    y = 275;
                    doc.setFontSize(7);
                    doc.setTextColor(150);
                    doc.setFont("helvetica", "italic");
                    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Autenticação: ${Math.random().toString(36).substring(2, 15).toUpperCase()}`, 105, y, { align: 'center' });

                    const pdfBlob = doc.output('blob');
                    doc.save(`salario_samu_${formData.id}.pdf`);
                    
                    try {
                        await sendToDiscord(pdfBlob, `salario_samu_${formData.id}.pdf`);
                        alert("Comprovante Gerado");
                    } catch (e) {
                        console.error("Erro ao enviar para Discord", e);
                        alert("Comprovante Gerado");
                    }
                } catch (err) {
                    console.error("Erro ao gerar PDF", err);
                    alert("Erro ao gerar comprovante PDF.");
                }
            };

            const handleSubmit = (e) => {
                e.preventDefault();
                setStatus('idle'); setErrorMessage('');
                
                if (formData.roleIndex === '') { setErrorMessage('Selecione um cargo.'); return; }
                if (!formData.time) { setErrorMessage('O horário é obrigatório.'); return; }

                setShowMetaConfirmation(true);
            };

            const cancelSubmit = () => {
                setShowMetaConfirmation(false);
                setStatus('error');
                setErrorMessage('É necessário estar com a meta financeira em dia.');
            };

            const confirmSubmit = async () => {
                setShowMetaConfirmation(false);
                setLoading(true); setStatus('idle'); setErrorMessage('');

                const role = salaryRoles[formData.roleIndex];
                const baseSalary = role.value;
                const companyVal = parseCurrency(formData.companyPayment);
                const otherVal = parseCurrency(formData.otherPaymentValue);
                const cleanId = formData.id.split(' ').join('');

                const total = baseSalary + companyVal + otherVal;
                const commissionVal = total * 0.10;
                const subtotal = total - commissionVal;
                const superTaxVal = subtotal > 5000000 ? subtotal * 0.07 : 0;
                const net = subtotal - superTaxVal;

                try {
                    const response = await fetch("https://apii-samu.onrender.com/solicitar-salario", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            nome: formData.name,
                            id: cleanId,
                            discord_id: cleanId,
                            discord_mention_id: formData.discordId,
                            cargo: role.name,
                            valor_solicitado: Math.round(total),
                            valor_bruto: Math.round(total),
                            taxa_financeiro: Math.round(commissionVal),
                            dia: formData.day,
                            horario: formData.time,
                            turno: formData.shift,
                            observacao: [
                                `Salario bruto: ${formatCurrency(total)}`,
                                `Taxa financeiro: -${formatCurrency(commissionVal)}`,
                                superTaxVal > 0 ? `Imposto super salario: -${formatCurrency(superTaxVal)}` : "",
                                companyVal > 0 ? `Pagamento companhias: ${formatCurrency(companyVal)}` : "",
                                otherVal > 0 ? `Outros (${formData.otherPaymentName}): ${formatCurrency(otherVal)}` : ""
                            ].filter(Boolean).join(" | ")
                        })
                    });

                    const result = await response.json().catch(() => ({}));
                    if (!response.ok || !result.sucesso) {
                        throw new Error(result.erro || "Falha ao enviar solicitacao");
                    }

                    setStatus('success');
                    generateSalaryReceipt();
                    setFormData({
                        name: '', id: '', discordId: '', roleIndex: '',
                        shift: 'noite', time: '', day: paymentWeek.min,
                        companyPayment: '', otherPaymentName: '', otherPaymentValue: ''
                    });
                    setSalaryFines([]);
                    setShowOthers(false);
                } catch (error) {
                    console.error('Erro:', error);
                    setStatus('error');
                    setErrorMessage(error.message || 'Ocorreu um erro ao enviar a solicitacao. Tente novamente.');
                } finally { setLoading(false); }
            };

            const currentRole = formData.roleIndex !== '' ? salaryRoles[formData.roleIndex] : null;
            const currentTotal = (currentRole ? currentRole.value : 0) + parseCurrency(formData.companyPayment) + parseCurrency(formData.otherPaymentValue);
            const currentCommission = currentTotal * 0.10;
            const currentSubtotal = currentTotal - currentCommission;
            const currentSuperTax = currentSubtotal > 5000000 ? currentSubtotal * 0.07 : 0;
            const currentNetBeforeFines = currentSubtotal - currentSuperTax;
            const currentFineTotal = salaryFines.reduce((sum, fine) => sum + parseCurrency(fine.valor), 0);
            const currentFineDiscount = Math.min(currentNetBeforeFines, currentFineTotal);
            const currentFineRemaining = Math.max(currentFineTotal - currentFineDiscount, 0);
            const currentNet = Math.max(currentNetBeforeFines - currentFineDiscount, 0);

            return (
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-3xl my-8 border border-gray-100 relative">
                    {showMetaConfirmation && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full animate-fade-in">
                                <div className="flex items-center mb-4 text-blue-600">
                                    <AlertCircle className="h-8 w-8 mr-3" />
                                    <h3 className="text-lg font-bold">Aviso Importante</h3>
                                </div>
                                <p className="text-gray-700 mb-6 font-medium">
                                    Membros acima de Médico-Chefe possuem obrigatoriedade em pagar a meta financeira semanal no valor de R$500.000.
                                </p>
                                <div className="flex justify-center">
                                    <button 
                                        onClick={confirmSubmit}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-md uppercase tracking-wide"
                                    >
                                        Ciente
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 px-8 py-6 border-b border-blue-100">
                        <h2 className="text-2xl font-bold text-blue-800">Solicitar Salário</h2>
                        <p className="text-blue-600 mt-1">Preencha os dados para aprovação do pagamento.</p>
                    </div>
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
                                <input type="text" id="name" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="Nome no jogo" />
                            </div>
                            <div>
                                <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">Seu ID</label>
                                <input type="text" id="id" name="id" required value={formData.id} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="Ex: 12345" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="discordId" className="block text-sm font-medium text-gray-700 mb-1">ID do Discord (para menção)</label>
                            <input type="text" id="discordId" name="discordId" value={formData.discordId} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="Ex: 123456789012345678" />
                            
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start shadow-sm">
                                <AlertCircle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-blue-800 font-medium leading-relaxed">
                                        Para pegar seu ID, ative o Modo Desenvolvedor no Discord, clique com botão direito no seu perfil e "Copiar ID". 
                                        <a href="https://www.youtube.com/watch?v=xX-aWpqnphI" target="_blank" rel="noopener noreferrer" className="underline ml-1 hover:text-blue-900 font-bold">
                                            Ver tutorial
                                        </a>
                                    </p>
                                    <p className="text-xs text-red-600 font-bold mt-2 uppercase tracking-wide">
                                        ⚠️ Caso estiver errado o pagamento será cancelado.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="roleIndex" className="block text-sm font-medium text-gray-700 mb-1">Seu Cargo</label>
                            <select id="roleIndex" name="roleIndex" required value={formData.roleIndex} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white">
                                <option value="">Selecione seu cargo...</option>
                                {salaryRoles.map((role, index) => (
                                    <option key={index} value={index}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            {formData.roleIndex !== '' && (
                                <div className={`mt-2 flex items-center text-xs font-bold uppercase tracking-wider p-2 rounded-md border ${salaryRoles[formData.roleIndex].mandatoryMeta ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                    <div className={`w-2 h-2 rounded-full mr-2 ${salaryRoles[formData.roleIndex].mandatoryMeta ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    {salaryRoles[formData.roleIndex].mandatoryMeta ? 'Meta Financeira Obrigatéria' : 'Isento de Meta Financeira'}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-1">Dia para receber</label>
                                <input type="date" id="day" name="day" required value={formData.day} min={paymentWeek.min} max={paymentWeek.max} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white" />
                            </div>
                            <div>
                                <label htmlFor="shift" className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                                <select id="shift" name="shift" required value={formData.shift} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white">
                                    <option value="manh?">Manh?</option>
                                    <option value="tarde">Tarde</option>
                                    <option value="noite">Noite</option>
                                    <option value="madrugada">Madrugada</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                                <input 
                                    type="text" 
                                    id="time" 
                                    name="time" 
                                    required 
                                    value={formData.time} 
                                    onChange={(e) => {
                                        let v = e.target.value.replace(/\D/g, '');
                                        if (v.length > 4) v = v.slice(0, 4);
                                        if (v.length > 2) v = v.slice(0, 2) + ':' + v.slice(2);
                                        handleInputChange({ target: { name: 'time', value: v } });
                                    }} 
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" 
                                    placeholder="00:00" 
                                    maxLength={5}
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center mb-3">
                                <input type="checkbox" id="showOthers" checked={showOthers} onChange={(e) => setShowOthers(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                <label htmlFor="showOthers" className="ml-2 block text-sm font-bold text-gray-700">Adicionar Pagamentos Adicionais (Recrutadores/Professores/Sorteios/Beneficios)</label>
                            </div>
                            
                            {showOthers && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <label htmlFor="companyPayment" className="block text-sm font-medium text-gray-700 mb-1">Pagamento Companhias (Valor)</label>
                                        <input type="text" id="companyPayment" name="companyPayment" value={formData.companyPayment} onChange={handleCurrencyInput} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="R$ 0" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="otherPaymentName" className="block text-sm font-medium text-gray-700 mb-1">Outros (Descrição)</label>
                                            <input type="text" id="otherPaymentName" name="otherPaymentName" value={formData.otherPaymentName} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="Ex: Bônus" />
                                        </div>
                                        <div>
                                            <label htmlFor="otherPaymentValue" className="block text-sm font-medium text-gray-700 mb-1">Outros (Valor)</label>
                                            <input type="text" id="otherPaymentValue" name="otherPaymentValue" value={formData.otherPaymentValue} onChange={handleCurrencyInput} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" placeholder="R$ 0" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Salário:</span>
                                <span className="font-bold text-gray-800">{formatCurrency(currentTotal)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Taxa Financeiro (-10%):</span>
                                <span className="font-bold text-red-500">-{formatCurrency(currentCommission)}</span>
                            </div>
                            {currentSuperTax > 0 && (
                                <div className="mb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Imposto Super Salário (-7%):</span>
                                        <span className="font-bold text-red-500">-{formatCurrency(currentSuperTax)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">(cobrado sobre valores líquidos acima de R$ 5.000.000)</p>
                                </div>
                            )}
                            {loadingFines && (
                                <div className="text-xs text-blue-600 font-bold mb-2">Consultando multas...</div>
                            )}
                            {salaryFines.map((fine) => (
                                <div key={fine.id} className="mb-2">
                                    <div className="flex justify-between items-start gap-3">
                                        <span className="text-red-700 font-bold">Multa: {fine.motivo || 'Sem motivo'}</span>
                                        <span className="font-bold text-red-600">{formatCurrency(parseCurrency(fine.valor))}</span>
                                    </div>
                                    <p className="text-xs text-red-500 mt-1">Valor da multa: {formatCurrency(parseCurrency(fine.valor))}</p>
                                </div>
                            ))}
                            {currentFineDiscount > 0 && (
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-red-700 font-bold">Total descontado em multas:</span>
                                    <span className="font-bold text-red-600">-{formatCurrency(currentFineDiscount)}</span>
                                </div>
                            )}
                            {currentFineRemaining > 0 && (
                                <div className="mb-2 p-2 bg-red-50 border border-red-100 rounded-md text-xs font-bold text-red-700">
                                    Restante pendente da multa: {formatCurrency(currentFineRemaining)}
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                <span className="text-lg font-bold text-blue-800">Valor Líquido a Receber:</span>
                                <span className="text-xl font-bold text-blue-800">{formatCurrency(currentNet)}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 text-right font-light">
                                {(() => {
                                    const ext = numeroPorExtenso(currentNet);
                                    return ext ? ext.charAt(0).toUpperCase() + ext.slice(1) : '';
                                })()}
                            </p>
                        </div>

                        {status === 'error' && <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700"><AlertCircle className="h-5 w-5 mr-2" /><span>{errorMessage}</span></div>}
                        {status === 'success' && <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700"><CheckCircle className="h-5 w-5 mr-2" /><span>confirme seu saque no Discord em pagamentos-pendentes!</span></div>}
                        
                        <button type="submit" disabled={loading} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}>
                            {loading ? <React.Fragment><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Enviando...</React.Fragment> : 'Agendar Pagamento'}
                        </button>
                    </form>
                </div>
            );
        };

        const PortalHeader = ({ onViewChange }) => (
            <header className="bg-white/90 backdrop-blur border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black leading-none">SAMU 192</h1>
                        <p className="text-xs text-gray-500 mt-1">Portal Oficial Interno</p>
                    </div>

                    <nav className="hidden md:flex gap-7 text-sm font-bold">
                        <button type="button" onClick={() => onViewChange('landing')} className="hover:text-red-600 transition">Início</button>
                        <button type="button" onClick={() => onViewChange('buy-role')} className="hover:text-red-600 transition">Compra de Cargo</button>
                        <button type="button" onClick={() => onViewChange('request-salary')} className="hover:text-red-600 transition">Solicitar Salário</button>
                    </nav>

                    <a href="https://discord.gg/vMydtZbPHJ" target="_blank" className="bg-black text-white px-5 py-3 rounded-xl font-black hover:bg-red-600 transition">
                        Acessar Discord
                    </a>
                </div>
            </header>
        );

        const NavBar = ({ currentView, onViewChange }) => (
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-[73px] z-40">
                <div className="container mx-auto px-2 md:px-4">
                    <div className="flex justify-center space-x-4 md:space-x-8">
                        <button
                            onClick={() => onViewChange('landing')}
                            className={`py-3 md:py-4 px-1 md:px-2 border-b-2 font-medium text-xs md:text-sm transition-colors ${currentView === 'landing' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Início
                        </button>
                        <button 
                            onClick={() => onViewChange('buy-role')}
                            className={`py-3 md:py-4 px-1 md:px-2 border-b-2 font-medium text-xs md:text-sm transition-colors ${currentView === 'buy-role' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Compra de Cargo
                        </button>
                        <button 
                            onClick={() => onViewChange('request-salary')}
                            className={`py-3 md:py-4 px-1 md:px-2 border-b-2 font-medium text-xs md:text-sm transition-colors ${currentView === 'request-salary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Solicitar Salário
                        </button>
                    </div>
                </div>
            </div>
        );


        const AdminPanel = ({ onMaintenanceChange }) => {
            const API_URL = "https://apii-samu.onrender.com";
            const emptyForm = { discord_id: '', valor: '', motivo: '', aplicada_por: 'presid' };
            const [logged, setLogged] = useState(false);
            const [login, setLogin] = useState({ usuario: '', senha: '' });
            const [registerForm, setRegisterForm] = useState({ nome: '', usuario: '', senha: '' });
            const [showRegister, setShowRegister] = useState(false);
            const [adminAuth, setAdminAuth] = useState({ token: '', admin: null });
            const [adminUsers, setAdminUsers] = useState([]);
            const [maintenanceActive, setMaintenanceActive] = useState(false);
            const [form, setForm] = useState(emptyForm);
            const [buscaId, setBuscaId] = useState('');
            const [filtroStatus, setFiltroStatus] = useState('todas');
            const [multas, setMultas] = useState([]);
            const [loadingAdmin, setLoadingAdmin] = useState(false);
            const [adminMsg, setAdminMsg] = useState('');
            const [editingId, setEditingId] = useState(null);
            const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
            const moneyInput = (value) => { const digits = String(value || '').replace(/\D/g, ''); return digits ? fmt(Number(digits)) : ''; };
            const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminAuth.token });
            const entrar = async (e) => { e.preventDefault(); setLoadingAdmin(true); setAdminMsg(''); try { const res = await fetch(API_URL + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(login) }); const data = await res.json(); if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Usuario ou senha incorretos.'); setAdminAuth({ token: data.token, admin: data.admin }); setForm({ ...emptyForm, aplicada_por: data.admin.usuario }); setLogged(true); setAdminMsg('Login realizado.'); } catch (err) { if (login.usuario === 'presid' && login.senha === 'robson2424') { setAdminAuth({ token: '', admin: { usuario: 'presid', nome: 'Presidencia', status: 'ativo', is_owner: true } }); setForm({ ...emptyForm, aplicada_por: 'presid' }); setLogged(true); setAdminMsg('Login realizado.'); } else { setAdminMsg(err.message || 'Usuario ou senha incorretos.'); } } finally { setLoadingAdmin(false); } };
            const registrar = async (e) => { e.preventDefault(); setLoadingAdmin(true); setAdminMsg(''); try { const res = await fetch(API_URL + '/admin/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registerForm) }); const data = await res.json(); if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Erro ao cadastrar.'); setAdminMsg('Cadastro enviado. Aguarde a presidencia aprovar.'); setRegisterForm({ nome: '', usuario: '', senha: '' }); setShowRegister(false); } catch (err) { setAdminMsg(err.message || 'Erro ao cadastrar.'); } finally { setLoadingAdmin(false); } };
            const sair = () => { localStorage.removeItem('samu_admin_logged'); setAdminAuth({ token: '', admin: null }); setAdminUsers([]); setLogged(false); };
            const limpar = () => { setEditingId(null); setForm(emptyForm); };
            const consultar = async (discordId = buscaId, status = filtroStatus) => { const idLimpo = String(discordId || '').trim(); setLoadingAdmin(true); setAdminMsg(''); try { const statusQuery = status && status !== 'todas' ? '?status=' + encodeURIComponent(status) : ''; const url = idLimpo ? API_URL + '/multas/' + encodeURIComponent(idLimpo) : API_URL + '/multas' + statusQuery; const res = await fetch(url); const raw = await res.text(); let data; try { data = raw ? JSON.parse(raw) : []; } catch { throw new Error('API ainda nao atualizada no Render. Atualize o index.js com a rota GET /multas.'); } if (!res.ok) throw new Error(data.erro || 'Erro ao consultar multas.'); const lista = Array.isArray(data) ? data : []; setMultas(idLimpo && status !== 'todas' ? lista.filter(m => m.status === status) : lista); } catch (err) { setAdminMsg(err.message || 'Erro ao consultar multas.'); } finally { setLoadingAdmin(false); } };
            const carregarUsuarios = async () => { if (!adminAuth.admin?.is_owner) return; try { if (!adminAuth.token) { setAdminUsers([{ id: 'presid', usuario: 'presid', nome: 'Presidencia', status: 'ativo', is_owner: true }]); return; } const res = await fetch(API_URL + '/admin/usuarios', { headers: authHeaders() }); const data = await res.json(); if (!res.ok) throw new Error(data.erro || 'Erro ao carregar usuarios.'); setAdminUsers(Array.isArray(data) ? data : []); } catch (err) { setAdminMsg(err.message || 'Erro ao carregar usuarios.'); } };
            const acaoUsuario = async (id, acao) => { setLoadingAdmin(true); setAdminMsg(''); try { const res = await fetch(API_URL + '/admin/usuarios/' + id + '/' + acao, { method: 'PATCH', headers: authHeaders() }); const data = await res.json(); if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Erro ao atualizar usuario.'); setAdminMsg('Usuario atualizado.'); await carregarUsuarios(); } catch (err) { setAdminMsg(err.message || 'Erro ao atualizar usuario.'); } finally { setLoadingAdmin(false); } };
            const removerUsuario = async (id) => { if (!confirm('Remover esta conta administrativa?')) return; setLoadingAdmin(true); setAdminMsg(''); try { const res = await fetch(API_URL + '/admin/usuarios/' + id, { method: 'DELETE', headers: authHeaders() }); const data = await res.json(); if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Erro ao remover usuario.'); setAdminMsg('Usuario removido.'); await carregarUsuarios(); } catch (err) { setAdminMsg(err.message || 'Erro ao remover usuario.'); } finally { setLoadingAdmin(false); } };
            const carregarManutencaoAdmin = async () => { try { const res = await fetch(API_URL + '/manutencao'); const data = await res.json(); setMaintenanceActive(Boolean(data.ativo)); } catch {} };
            const alternarManutencao = async () => { const novoStatus = !maintenanceActive; setLoadingAdmin(true); setAdminMsg(''); try { const res = await fetch(API_URL + '/manutencao', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: novoStatus, admin: adminAuth.admin?.usuario || 'presid' }) }); const data = await res.json(); if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Erro ao atualizar manutencao.'); setMaintenanceActive(Boolean(data.ativo)); setAdminMsg(data.ativo ? 'Site colocado em manutencao.' : 'Manutencao desativada.'); if (onMaintenanceChange) onMaintenanceChange(); } catch (err) { setAdminMsg(err.message || 'Erro ao atualizar manutencao.'); } finally { setLoadingAdmin(false); } };
            const salvar = async (e) => { e.preventDefault(); const valorLimpo = Number(String(form.valor).replace(/\D/g, '')); if (!form.discord_id.trim() || !valorLimpo) { setAdminMsg('Informe ID e valor.'); return; } setLoadingAdmin(true); setAdminMsg(''); try { const url = editingId ? API_URL + '/multas/' + editingId : API_URL + '/multas'; const method = editingId ? 'PATCH' : 'POST'; const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discord_id: form.discord_id.trim(), valor: valorLimpo, motivo: form.motivo.trim(), aplicada_por: form.aplicada_por.trim() || 'presid' }) }); const data = await res.json(); if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Erro ao salvar multa.'); setAdminMsg(editingId ? 'Multa editada com sucesso.' : 'Multa aplicada com sucesso.'); setBuscaId(''); setFiltroStatus('todas'); await consultar('', 'todas'); limpar(); } catch (err) { setAdminMsg(err.message || 'Erro ao salvar multa.'); } finally { setLoadingAdmin(false); } };
            const editar = (m) => { setEditingId(m.id); setForm({ discord_id: m.discord_id || '', valor: moneyInput(m.valor), motivo: m.motivo || '', aplicada_por: m.aplicada_por || 'presid' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
            const cancelar = async (id) => { if (!confirm('Cancelar esta multa?')) return; setLoadingAdmin(true); try { const res = await fetch(API_URL + '/multas/' + id + '/cancelar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin: 'presid' }) }); const data = await res.json(); if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Erro ao cancelar multa.'); setAdminMsg('Multa cancelada.'); await consultar(buscaId || data.multa.discord_id, filtroStatus); } catch (err) { setAdminMsg(err.message || 'Erro ao cancelar multa.'); } finally { setLoadingAdmin(false); } };
            const remover = async (id) => { if (!confirm('Remover definitivamente esta multa?')) return; setLoadingAdmin(true); try { const res = await fetch(API_URL + '/multas/' + id, { method: 'DELETE' }); const data = await res.json(); if (!res.ok || !data.sucesso) throw new Error(data.erro || 'Erro ao remover multa.'); setAdminMsg('Multa removida.'); await consultar(buscaId, filtroStatus); } catch (err) { setAdminMsg(err.message || 'Erro ao remover multa.'); } finally { setLoadingAdmin(false); } };
            useEffect(() => { if (logged) { consultar('', 'todas'); carregarUsuarios(); carregarManutencaoAdmin(); } }, [logged, adminAuth.admin?.is_owner]);
            if (!logged) return (<div className="max-w-md mx-auto bg-white rounded-xl shadow-md border my-8 overflow-hidden"><div className="bg-gray-900 text-white px-8 py-6"><h2 className="text-2xl font-black">Admin Financeiro</h2><p className="text-gray-300 text-sm mt-1">{showRegister ? 'Solicitar acesso' : 'Acesso restrito'}</p></div>{!showRegister ? <form onSubmit={entrar} className="p-8 space-y-5"><div><label className="block text-sm font-bold text-gray-700 mb-1">Usuario</label><input value={login.usuario} onChange={e => setLogin({ ...login, usuario: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Senha</label><input type="password" value={login.senha} onChange={e => setLogin({ ...login, senha: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>{adminMsg && <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm font-bold">{adminMsg}</div>}<button disabled={loadingAdmin} className="w-full bg-gray-900 text-white py-3 rounded-lg font-black hover:bg-red-600 disabled:opacity-60">Entrar</button><button type="button" onClick={() => { setShowRegister(true); setAdminMsg(''); }} className="w-full border py-3 rounded-lg font-black">Registrar-se</button></form> : <form onSubmit={registrar} className="p-8 space-y-5"><div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input value={registerForm.nome} onChange={e => setRegisterForm({ ...registerForm, nome: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Usuario</label><input required value={registerForm.usuario} onChange={e => setRegisterForm({ ...registerForm, usuario: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Senha</label><input required type="password" value={registerForm.senha} onChange={e => setRegisterForm({ ...registerForm, senha: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>{adminMsg && <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-sm font-bold">{adminMsg}</div>}<button disabled={loadingAdmin} className="w-full bg-red-600 text-white py-3 rounded-lg font-black disabled:opacity-60">Enviar cadastro</button><button type="button" onClick={() => { setShowRegister(false); setAdminMsg(''); }} className="w-full border py-3 rounded-lg font-black">Voltar para login</button></form>}</div>);
            return (<div className="max-w-6xl mx-auto my-8 space-y-6"><div className="bg-white rounded-xl shadow-md border overflow-hidden"><div className="bg-gray-900 text-white px-8 py-6 flex items-center justify-between gap-4"><div><h2 className="text-2xl font-black">Painel Admin - Multas</h2><p className="text-gray-300 text-sm">Aplicar, editar, cancelar e consultar multas.</p></div><button type="button" onClick={sair} className="px-4 py-2 bg-white text-gray-900 rounded-lg font-bold">Sair</button></div><form onSubmit={salvar} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5"><div><label className="block text-sm font-bold mb-1">ID do Discord</label><input required value={form.discord_id} onChange={e => setForm({ ...form, discord_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-bold mb-1">Valor</label><input required value={form.valor} onChange={e => setForm({ ...form, valor: moneyInput(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" placeholder="R$ 0" /></div><div><label className="block text-sm font-bold mb-1">Motivo</label><input value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div><div><label className="block text-sm font-bold mb-1">Aplicada por</label><input value={form.aplicada_por} onChange={e => setForm({ ...form, aplicada_por: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div><div className="md:col-span-2 flex items-end gap-3"><button disabled={loadingAdmin} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-black disabled:opacity-60">{editingId ? 'Salvar edicao' : 'Aplicar multa'}</button>{editingId && <button type="button" onClick={limpar} className="px-4 py-3 border rounded-lg font-bold">Cancelar edicao</button>}</div></form></div>{adminAuth.admin?.is_owner && <div className="bg-white rounded-xl shadow-md border overflow-hidden"><div className="px-8 py-6 bg-gray-50 border-b flex items-center justify-between"><h3 className="text-xl font-black">Usuarios administrativos</h3><button type="button" onClick={carregarUsuarios} className="px-4 py-2 bg-gray-900 text-white rounded-lg font-bold">Atualizar</button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-900 text-white"><tr><th className="text-left p-3">Usuario</th><th className="text-left p-3">Nome</th><th className="text-left p-3">Status</th><th className="text-right p-3">Acoes</th></tr></thead><tbody>{adminUsers.length === 0 ? (<tr><td colSpan="4" className="p-6 text-center text-gray-500">Nenhum usuario encontrado.</td></tr>) : adminUsers.map(u => (<tr key={u.id} className="border-b"><td className="p-3 font-bold">{u.usuario}{u.is_owner ? ' (dono)' : ''}</td><td className="p-3">{u.nome || '-'}</td><td className="p-3">{u.status}</td><td className="p-3"><div className="flex justify-end gap-2">{!u.is_owner && u.status !== 'ativo' && <button type="button" onClick={() => acaoUsuario(u.id, 'aprovar')} className="px-3 py-1 bg-green-600 text-white rounded font-bold">Aprovar</button>}{!u.is_owner && u.status !== 'desativado' && <button type="button" onClick={() => acaoUsuario(u.id, 'desativar')} className="px-3 py-1 bg-yellow-500 text-white rounded font-bold">Desativar</button>}{!u.is_owner && <button type="button" onClick={() => removerUsuario(u.id)} className="px-3 py-1 bg-red-600 text-white rounded font-bold">Remover</button>}</div></td></tr>))}</tbody></table></div></div>}{adminAuth.admin?.is_owner && <div className="bg-white rounded-xl shadow-md border overflow-hidden"><div className="px-8 py-6 bg-gray-50 border-b flex items-center justify-between gap-4"><div><h3 className="text-xl font-black">Manutencao do site</h3><p className="text-sm text-gray-500 mt-1">{maintenanceActive ? 'Site em manutencao no momento.' : 'Site liberado para visualizacao.'}</p></div><button type="button" disabled={loadingAdmin} onClick={alternarManutencao} className={`px-4 py-2 rounded-lg font-bold text-white disabled:opacity-60 ${maintenanceActive ? 'bg-green-600' : 'bg-red-600'}`}>{maintenanceActive ? 'Desativar' : 'Habilitar'}</button></div></div>}<div className="bg-white rounded-xl shadow-md border overflow-hidden"><div className="px-8 py-6 bg-gray-50 border-b"><h3 className="text-xl font-black">Consultar multas</h3><div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 mt-4"><input value={buscaId} onChange={e => setBuscaId(e.target.value)} className="px-4 py-2 border rounded-lg" placeholder="ID do Discord" /><select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); consultar(buscaId, e.target.value); }} className="px-4 py-2 border rounded-lg bg-white"><option value="pendente">Multas ativas</option><option value="paga">Multas pagas</option><option value="cancelada">Multas canceladas</option><option value="todas">Todas</option></select><button type="button" disabled={loadingAdmin} onClick={() => consultar()} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-60">Consultar</button></div>{adminMsg && <div className="mt-4 p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-sm font-bold">{adminMsg}</div>}</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-900 text-white"><tr><th className="text-left p-3">ID</th><th className="text-left p-3">Discord</th><th className="text-left p-3">Valor</th><th className="text-left p-3">Motivo</th><th className="text-left p-3">Status</th><th className="text-right p-3">Acoes</th></tr></thead><tbody>{multas.length === 0 ? (<tr><td colSpan="6" className="p-6 text-center text-gray-500">Nenhuma multa encontrada.</td></tr>) : multas.map(m => (<tr key={m.id} className="border-b"><td className="p-3 font-bold">#{m.id}</td><td className="p-3">{m.discord_id}</td><td className="p-3 font-bold text-red-600">{fmt(m.valor)}</td><td className="p-3">{m.motivo || '-'}</td><td className="p-3">{m.status}</td><td className="p-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => editar(m)} className="px-3 py-1 border rounded font-bold">Editar</button>{m.status === 'pendente' && <button type="button" onClick={() => cancelar(m.id)} className="px-3 py-1 bg-yellow-500 text-white rounded font-bold">Cancelar</button>}<button type="button" onClick={() => remover(m.id)} className="px-3 py-1 bg-red-600 text-white rounded font-bold">Remover</button></div></td></tr>))}</tbody></table></div></div></div>);
        };

        const AdminFloatingButton = ({ onViewChange }) => (<button type="button" onClick={() => onViewChange('admin')} className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl font-black text-sm hover:bg-red-600 transition border border-white/20" title="Painel Admin">Admin</button>);
        const MaintenanceScreen = ({ onViewChange }) => (<div className="min-h-screen bg-gray-100 flex items-center justify-center px-6"><AdminFloatingButton onViewChange={onViewChange} /><div className="bg-white rounded-2xl shadow-xl border max-w-md w-full p-8 text-center"><img src="https://i.imgur.com/sD1OnjL.png" alt="SAMU" className="w-24 h-24 mx-auto rounded-2xl object-contain mb-5" /><h1 className="text-3xl font-black text-gray-900">SAMU 192</h1><p className="text-gray-500 mt-1">Site em manutenção.</p><div className="mt-6 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full w-1/2 bg-red-600 rounded-full animate-pulse"></div></div><p className="mt-6 text-sm font-bold text-red-700 min-h-[44px]">Voltaremos em breve.</p></div></div>);
        const App = () => {
            const [currentView, setCurrentView] = useState('landing');
            const [maintenanceActive, setMaintenanceActive] = useState(false);

            const carregarManutencao = async () => {
                try {
                    const res = await fetch("https://apii-samu.onrender.com/manutencao");
                    const data = await res.json();
                    setMaintenanceActive(Boolean(data.ativo));
                } catch {
                    setMaintenanceActive(false);
                }
            };

            useEffect(() => {
                carregarManutencao();
                const intervalo = setInterval(carregarManutencao, 30000);
                return () => clearInterval(intervalo);
            }, []);

            if (maintenanceActive && currentView !== 'admin') {
                return <MaintenanceScreen onViewChange={setCurrentView} />;
            }

            if (currentView === 'landing') {
                return <LandingPage onViewChange={setCurrentView} />;
            }

            return (
                <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
                    <PortalHeader onViewChange={setCurrentView} />
                    <AdminFloatingButton onViewChange={setCurrentView} />
                    <main className="flex-grow container mx-auto px-4 py-8">
                        {currentView === 'buy-role' && <RoleForm />}
                        {currentView === 'request-salary' && <SalaryForm />}
                        {currentView === 'admin' && <AdminPanel onMaintenanceChange={carregarManutencao} />}
                    </main>
                    <footer className="bg-white border-t mt-12">
                        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
                            © 2026 SAMU 192 — Portal institucional interno. Todos os direitos reservados. Este site e todo o seu conteúdo (incluindo textos, imagens, design, estrutura, layout, identidade visual e código-fonte) são protegidos pela Lei nº 9.610/1998 (Lei de Direitos Autorais) e demais legislações aplicáveis.
                        </div>
                    </footer>
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>

