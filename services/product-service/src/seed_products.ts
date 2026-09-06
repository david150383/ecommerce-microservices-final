import pg from "pg";
import crypto from "node:crypto";

const productPool = new pg.Pool({
  host: "localhost",
  port: 5432,
  user: "ecommerce",
  password: "ecommerce",
  database: "product_db",
});

const inventoryPool = new pg.Pool({
  host: "localhost",
  port: 5432,
  user: "ecommerce",
  password: "ecommerce",
  database: "inventory_db",
});

interface SeedProduct {
  sku: string;
  name: string;
  slug: string;
  category: string;
  priceCents: number;
  description: string;
}

const PRODUCTS_DATA: SeedProduct[] = [
  // 1. Computers (10)
  {
    sku: "CMP-001",
    name: "UltraBook Air 15",
    slug: "ultrabook-air-15",
    category: "Computers",
    priceCents: 129900,
    description: "Ultra-slim 15.3-inch liquid retina laptop with M-series silicon, 18-hour battery, and fanless silent chassis.",
  },
  {
    sku: "CMP-002",
    name: "Creator Studio Pro Workstation",
    slug: "creator-studio-pro-workstation",
    category: "Computers",
    priceCents: 249900,
    description: "High-performance workstation featuring 24-core CPU, 64GB unified memory, and hardware-accelerated ray tracing.",
  },
  {
    sku: "CMP-003",
    name: "ThinkStation Enterprise Desktop",
    slug: "thinkstation-enterprise-desktop",
    category: "Computers",
    priceCents: 169900,
    description: "Enterprise tower engineered for mission-critical software, dual redundant power supplies, and toolless serviceability.",
  },
  {
    sku: "CMP-004",
    name: "Thin & Light Carbon 14",
    slug: "thin-and-light-carbon-14",
    category: "Computers",
    priceCents: 139900,
    description: "Aerospace-grade carbon fiber body weighing only 1.1kg with a gorgeous 2.8K OLED 120Hz display.",
  },
  {
    sku: "CMP-005",
    name: "Dual-Screen Mobile Studio",
    slug: "dual-screen-mobile-studio",
    category: "Computers",
    priceCents: 199900,
    description: "Revolutionary dual 14-inch OLED touch displays for seamless multitasking, audio editing, and live code previewing.",
  },
  {
    sku: "CMP-006",
    name: "Fanless Mini PC Pro",
    slug: "fanless-mini-pc-pro",
    category: "Computers",
    priceCents: 64900,
    description: "Completely passive silent mini computer supporting quad 4K displays, dual 2.5G Ethernet, and low power draw.",
  },
  {
    sku: "CMP-007",
    name: "Rugged Field Laptop X",
    slug: "rugged-field-laptop-x",
    category: "Computers",
    priceCents: 189900,
    description: "MIL-STD-810H certified weather-sealed magnesium chassis designed for extreme conditions and all-day outdoor operation.",
  },
  {
    sku: "CMP-008",
    name: "Compact All-in-One PC 27",
    slug: "compact-all-in-one-pc-27",
    category: "Computers",
    priceCents: 149900,
    description: "Sleek 27-inch 4K borderless all-in-one desktop with studio-quality far-field mics and pop-up privacy camera.",
  },
  {
    sku: "CMP-009",
    name: "Linux Developer Edition Laptop",
    slug: "linux-developer-edition-laptop",
    category: "Computers",
    priceCents: 124900,
    description: "Open-source optimized laptop with verified mainline kernel drivers, hardware kill switches, and matte IPS display.",
  },
  {
    sku: "CMP-010",
    name: "Cloud Edge Micro Server",
    slug: "cloud-edge-micro-server",
    category: "Computers",
    priceCents: 89900,
    description: "Self-hosting and edge computing server with 32GB ECC RAM, quad NVMe slots, and dual 10GbE network interfaces.",
  },

  // 2. Audio (10)
  {
    sku: "AUD-001",
    name: "Pro Studio Over-Ear Headphones",
    slug: "pro-studio-over-ear-headphones",
    category: "Audio",
    priceCents: 34900,
    description: "Reference-grade 45mm beryllium drivers delivering neutral sound reproduction and plush memory foam ear cushions.",
  },
  {
    sku: "AUD-002",
    name: "Active Noise Canceling Earbuds",
    slug: "active-noise-canceling-earbuds",
    category: "Audio",
    priceCents: 19900,
    description: "Adaptive hybrid ANC with transparency mode, multipoint Bluetooth 5.4, and IPX7 sweat resistance.",
  },
  {
    sku: "AUD-003",
    name: "Spatial Audio Soundbar 5.1",
    slug: "spatial-audio-soundbar-5-1",
    category: "Audio",
    priceCents: 49900,
    description: "Dolby Atmos enabled 5.1 soundbar system with wireless subwoofer and room calibration audio tuning.",
  },
  {
    sku: "AUD-004",
    name: "Audiophile Open-Back Headphones",
    slug: "audiophile-open-back-headphones",
    category: "Audio",
    priceCents: 44900,
    description: "Open-back planar magnetic headphones offering an expansive soundstage and lifelike instrumental separation.",
  },
  {
    sku: "AUD-005",
    name: "Portable Waterproof Speaker",
    slug: "portable-waterproof-speaker",
    category: "Audio",
    priceCents: 12900,
    description: "360-degree room-filling acoustic output with deep bass radiators and 24-hour continuous playback.",
  },
  {
    sku: "AUD-006",
    name: "Wireless Desktop Monitor Speakers",
    slug: "wireless-desktop-monitor-speakers",
    category: "Audio",
    priceCents: 27900,
    description: "Compact bi-amped bookshelf studio monitors with carbon fiber woofers and silk dome tweeters.",
  },
  {
    sku: "AUD-007",
    name: "USB-C Podcast Condenser Microphone",
    slug: "usb-c-podcast-condenser-microphone",
    category: "Audio",
    priceCents: 14900,
    description: "Broadcast-ready cardioid capsule with zero-latency headphone monitoring, built-in shock mount, and pop filter.",
  },
  {
    sku: "AUD-008",
    name: "High-Res Audio DAC & Headphone Amp",
    slug: "high-res-audio-dac-and-headphone-amp",
    category: "Audio",
    priceCents: 18900,
    description: "32-bit/768kHz DSD512 desktop digital-to-analog converter with balanced 4.4mm and 6.35mm outputs.",
  },
  {
    sku: "AUD-009",
    name: "Magnetic Wireless Neckband Earbuds",
    slug: "magnetic-wireless-neckband-earbuds",
    category: "Audio",
    priceCents: 7900,
    description: "Ultra-comfortable flexible neckband with instant magnetic play/pause and fast warp charging.",
  },
  {
    sku: "AUD-010",
    name: "Bluetooth Party Speaker Pro",
    slug: "bluetooth-party-speaker-pro",
    category: "Audio",
    priceCents: 39900,
    description: "High-output 160W portable speaker with synchronized beat-driven dynamic RGB light show and guitar input.",
  },

  // 3. Wearables (10)
  {
    sku: "WRB-001",
    name: "Apex Titanium Smartwatch Pro",
    slug: "apex-titanium-smartwatch-pro",
    category: "Wearables",
    priceCents: 79900,
    description: "Grade 5 titanium aerospace case, sapphire crystal glass, precision dual-frequency GPS, and 100m water rating.",
  },
  {
    sku: "WRB-002",
    name: "Endurance GPS Fitness Tracker",
    slug: "endurance-gps-fitness-tracker",
    category: "Wearables",
    priceCents: 29900,
    description: "Solar-charging transflective display with 30-day battery life and comprehensive VO2 max training metrics.",
  },
  {
    sku: "WRB-003",
    name: "Ceramic Hybrid Luxury Watch",
    slug: "ceramic-hybrid-luxury-watch",
    category: "Wearables",
    priceCents: 49900,
    description: "Mechanical hands over hidden AMOLED smart screen encased in polished zirconia white ceramic.",
  },
  {
    sku: "WRB-004",
    name: "Health Ring Bio-Tracker",
    slug: "health-ring-bio-tracker",
    category: "Wearables",
    priceCents: 29900,
    description: "Featherweight titanium smart ring continuously monitoring sleep stages, skin temperature, and readiness scores.",
  },
  {
    sku: "WRB-005",
    name: "Smart Cycling Glasses HUD",
    slug: "smart-cycling-glasses-hud",
    category: "Wearables",
    priceCents: 37900,
    description: "Heads-up display smart glasses projecting speed, cadence, turn-by-turn navigation, and heart rate.",
  },
  {
    sku: "WRB-006",
    name: "Rugged Mountaineer Alt-Compass Watch",
    slug: "rugged-mountaineer-alt-compass-watch",
    category: "Wearables",
    priceCents: 34900,
    description: "Barometric altimeter, 3D compass, storm alarm alerts, and offline topographic contour maps.",
  },
  {
    sku: "WRB-007",
    name: "Sleep Tracking Smart Band",
    slug: "sleep-tracking-smart-band",
    category: "Wearables",
    priceCents: 9900,
    description: "Screenless ultra-light wristband designed for 24/7 recovery tracking, HRV monitoring, and silent vibration alarm.",
  },
  {
    sku: "WRB-008",
    name: "ECG Heart Monitor Smart Watch",
    slug: "ecg-heart-monitor-smart-watch",
    category: "Wearables",
    priceCents: 24900,
    description: "FDA-cleared on-demand electrocardiogram sensor with irregular rhythm notifications and blood oxygen sensor.",
  },
  {
    sku: "WRB-009",
    name: "Smart Fabric Fitness Vest",
    slug: "smart-fabric-fitness-vest",
    category: "Wearables",
    priceCents: 15900,
    description: "Breathable compression top with interwoven bio-sensors tracking muscle activation and respiratory rates.",
  },
  {
    sku: "WRB-010",
    name: "Waterproof Swim Tracker Watch",
    slug: "waterproof-swim-tracker-watch",
    category: "Wearables",
    priceCents: 17900,
    description: "Pool and open water swim tracking calculating stroke type, SWOLF efficiency score, and lap splits.",
  },

  // 4. Accessories (10)
  {
    sku: "ACC-001",
    name: "Ergonomic Mechanical Keyboard (RGB)",
    slug: "ergonomic-mechanical-keyboard-rgb",
    category: "Accessories",
    priceCents: 17900,
    description: "Hot-swappable tactile switches, gasket-mounted sound dampening, aluminum top frame, and per-key RGB.",
  },
  {
    sku: "ACC-002",
    name: "Wireless Trackball Precision Mouse",
    slug: "wireless-trackball-precision-mouse",
    category: "Accessories",
    priceCents: 9900,
    description: "20-degree adjustable tilt angle reducing muscle strain by 20%, precision optical sensor, and dual connectivity.",
  },
  {
    sku: "ACC-003",
    name: "Anodized Aluminum Laptop Stand",
    slug: "anodized-aluminum-laptop-stand",
    category: "Accessories",
    priceCents: 4900,
    description: "CNC machined aluminum riser elevating screens to eye level with integrated cable management.",
  },
  {
    sku: "ACC-004",
    name: "10-in-1 Thunderbolt 4 Hub",
    slug: "10-in-1-thunderbolt-4-hub",
    category: "Accessories",
    priceCents: 21900,
    description: "40Gbps bandwidth hub driving dual 4K 60Hz displays, 96W power delivery, 2.5G Ethernet, and SD 4.0 card slot.",
  },
  {
    sku: "ACC-005",
    name: "Braided Silicone USB-C 240W Cable",
    slug: "braided-silicone-usb-c-240w-cable",
    category: "Accessories",
    priceCents: 2900,
    description: "E-marker chip supporting USB Power Delivery 3.1 up to 240W, tangle-free silicone jacket rated for 50,000 bends.",
  },
  {
    sku: "ACC-006",
    name: "Premium Leather Desk Mat",
    slug: "premium-leather-desk-mat",
    category: "Accessories",
    priceCents: 5900,
    description: "Vegetable-tanned full-grain leather desk pad with non-slip suede backing and water-resistant coating.",
  },
  {
    sku: "ACC-007",
    name: "MagSafe 3-in-1 Wireless Charging Pad",
    slug: "magsafe-3-in-1-wireless-charging-pad",
    category: "Accessories",
    priceCents: 12900,
    description: "Fast-charging wireless station powering phone (15W), smartwatch, and earbuds simultaneously.",
  },
  {
    sku: "ACC-008",
    name: "Precision Gaming Mouse Pad XL",
    slug: "precision-gaming-mouse-pad-xl",
    category: "Accessories",
    priceCents: 3400,
    description: "Micro-textured hybrid cloth surface engineered for balanced speed and stopping power, with stitched edges.",
  },
  {
    sku: "ACC-009",
    name: "GaN 140W Multi-Port Charger",
    slug: "gan-140w-multi-port-charger",
    category: "Accessories",
    priceCents: 8900,
    description: "Gallium Nitride charging brick with 3x USB-C and 1x USB-A ports capable of fast-charging a laptop and two phones.",
  },
  {
    sku: "ACC-010",
    name: "Mechanical Switch Keycap Set",
    slug: "mechanical-switch-keycap-set",
    category: "Accessories",
    priceCents: 6900,
    description: "Double-shot PBT keycaps in retro gradient profile resistant to oil shine and legend fading.",
  },

  // 5. Displays (10)
  {
    sku: "DSP-001",
    name: "32-inch 4K OLED Pro Creative Display",
    slug: "32-inch-4k-oled-pro-creative-display",
    category: "Displays",
    priceCents: 129900,
    description: "Pure RGB OLED panel with 99% DCI-P3 coverage, true 10-bit color, 0.1ms response time, and factory color calibration.",
  },
  {
    sku: "DSP-002",
    name: "27-inch 240Hz Fast IPS Esports Monitor",
    slug: "27-inch-240hz-fast-ips-esports-monitor",
    category: "Displays",
    priceCents: 44900,
    description: "Ultra-fast 240Hz refresh rate, 1ms GtG response, AMD FreeSync Premium Pro, and QHD 2560x1440 resolution.",
  },
  {
    sku: "DSP-003",
    name: "34-inch Ultrawide Curved Productivity Screen",
    slug: "34-inch-ultrawide-curved-productivity-screen",
    category: "Displays",
    priceCents: 69900,
    description: "21:9 WQHD 1900R curve with integrated KVM switch, 90W USB-C single-cable connectivity, and picture-by-picture.",
  },
  {
    sku: "DSP-004",
    name: "16-inch 2.5K Portable Travel Monitor",
    slug: "16-inch-2-5k-portable-travel-monitor",
    category: "Displays",
    priceCents: 24900,
    description: "Ultra-portable secondary screen weighing 750g with 2560x1600 16:10 ratio, 500 nits brightness, and magnetic kickstand.",
  },
  {
    sku: "DSP-005",
    name: "49-inch Super Ultrawide Gaming Display",
    slug: "49-inch-super-ultrawide-gaming-display",
    category: "Displays",
    priceCents: 119900,
    description: "32:9 dual QHD curved monitor replacing multi-monitor setups with 1000R curvature and 144Hz refresh rate.",
  },
  {
    sku: "DSP-006",
    name: "27-inch 5K Color-Accurate Designer Monitor",
    slug: "27-inch-5k-color-accurate-designer-monitor",
    category: "Displays",
    priceCents: 99900,
    description: "5120x2880 retina pixel density with anti-reflective nano-texture glass, Thunderbolt daisy-chaining, and 600 nits.",
  },
  {
    sku: "DSP-007",
    name: "Heavy-Duty Gas Spring Dual Monitor Arm",
    slug: "heavy-duty-gas-spring-dual-monitor-arm",
    category: "Displays",
    priceCents: 11900,
    description: "Full-motion ergonomic dual monitor mount supporting screens up to 35 inches and 12kg each.",
  },
  {
    sku: "DSP-008",
    name: "Monitor Light Bar with Auto-Dimming",
    slug: "monitor-light-bar-with-auto-dimming",
    category: "Displays",
    priceCents: 7900,
    description: "Screen glare-free asymmetric optical lamp with wireless desktop rotary dial and ambient lux sensor.",
  },
  {
    sku: "DSP-009",
    name: "4K Micro-LED Modular Display Panel",
    slug: "4k-micro-led-modular-display-panel",
    category: "Displays",
    priceCents: 179900,
    description: "Next-gen self-emissive micro-LED panel offering infinite contrast, 1500 nits peak HDR, and zero burn-in risk.",
  },
  {
    sku: "DSP-010",
    name: "24-inch Ergonomic Office Monitor",
    slug: "24-inch-ergonomic-office-monitor",
    category: "Displays",
    priceCents: 19900,
    description: "Flicker-free low blue light IPS display with full pivot, swivel, tilt, and height adjustment.",
  },

  // 6. Gaming (10)
  {
    sku: "GMG-001",
    name: "Apex Edge Wireless Gaming Controller",
    slug: "apex-edge-wireless-gaming-controller",
    category: "Gaming",
    priceCents: 14900,
    description: "Hall-effect anti-drift magnetic joysticks, remappable rear paddles, and adjustable mechanical hair triggers.",
  },
  {
    sku: "GMG-002",
    name: "VR Headset Pro with Eye Tracking",
    slug: "vr-headset-pro-with-eye-tracking",
    category: "Gaming",
    priceCents: 89900,
    description: "Next-generation standalone virtual reality headset with dual 4K pancake lenses and foveated rendering.",
  },
  {
    sku: "GMG-003",
    name: "Flight Simulator Precision Throttle & Stick",
    slug: "flight-simulator-precision-throttle-and-stick",
    category: "Gaming",
    priceCents: 29900,
    description: "Dual-throttle HOTAS system with contactless sensors, 33 programmable buttons, and realistic friction adjust.",
  },
  {
    sku: "GMG-004",
    name: "Racing Wheel & Force Feedback Pedals",
    slug: "racing-wheel-and-force-feedback-pedals",
    category: "Gaming",
    priceCents: 39900,
    description: "Direct-drive force feedback wheel with load-cell magnetic pedals and hand-stitched leather rim.",
  },
  {
    sku: "GMG-005",
    name: "Arcade Fight Stick Tournament Edition",
    slug: "arcade-fight-stick-tournament-edition",
    category: "Gaming",
    priceCents: 18900,
    description: "Sanwa Denshi joystick and buttons, aluminum top plate, and quick-open compartment for custom modding.",
  },
  {
    sku: "GMG-006",
    name: "Ultra-Low Latency Wireless Gaming Headset",
    slug: "ultra-low-latency-wireless-gaming-headset",
    category: "Gaming",
    priceCents: 16900,
    description: "2.4GHz lossless wireless audio, planar magnetic drivers, retractable broadcast microphone, and 50h battery.",
  },
  {
    sku: "GMG-007",
    name: "Handheld PC Gaming Console (1TB)",
    slug: "handheld-pc-gaming-console-1tb",
    category: "Gaming",
    priceCents: 64900,
    description: "Portable gaming handheld powered by Zen4 APU, 7-inch 120Hz VRR touch display, and ergonomic hall triggers.",
  },
  {
    sku: "GMG-008",
    name: "RGB Headphone Stand with USB Hub",
    slug: "rgb-headphone-stand-with-usb-hub",
    category: "Gaming",
    priceCents: 4900,
    description: "Weighted aluminum headset stand with 3-port USB 3.0 pass-through hub and customizable dynamic underglow.",
  },
  {
    sku: "GMG-009",
    name: "Modular Gaming Keypad with Analog Stick",
    slug: "modular-gaming-keypad-with-analog-stick",
    category: "Gaming",
    priceCents: 12900,
    description: "One-handed 32-key ergonomic keypad with thumb-controlled 8-way directional analog stick.",
  },
  {
    sku: "GMG-010",
    name: "Ergonomic Memory Foam Gaming Chair",
    slug: "ergonomic-memory-foam-gaming-chair",
    category: "Gaming",
    priceCents: 39900,
    description: "Cold-cured high-density foam chair with 4D armrests, integrated magnetic lumbar pillow, and 165-degree recline.",
  },

  // 7. Mobile (10)
  {
    sku: "MBL-001",
    name: "Apex Ultra 5G Flagship Smartphone",
    slug: "apex-ultra-5g-flagship-smartphone",
    category: "Mobile",
    priceCents: 119900,
    description: "Titanium alloy frame, 1-inch 200MP camera sensor, 120W HyperCharge, and 6.8-inch LTPO 144Hz AMOLED screen.",
  },
  {
    sku: "MBL-002",
    name: "Compact Foldable OLED Smartphone",
    slug: "compact-foldable-oled-smartphone",
    category: "Mobile",
    priceCents: 99900,
    description: "Pocket-sized clamshell folding phone with zero-gap teardrop hinge and 3.6-inch interactive outer cover display.",
  },
  {
    sku: "MBL-003",
    name: "Rugged Outdoor Waterproof Phone",
    slug: "rugged-outdoor-waterproof-phone",
    category: "Mobile",
    priceCents: 49900,
    description: "Drop-proof, shock-proof IP69K phone with built-in thermal imaging FLIR sensor and 10,600mAh battery.",
  },
  {
    sku: "MBL-004",
    name: "11-inch 120Hz Drawing Tablet Pro",
    slug: "11-inch-120hz-drawing-tablet-pro",
    category: "Mobile",
    priceCents: 79900,
    description: "Liquid Retina display, octa-core neural processing engine, desktop-class creative app multitasking.",
  },
  {
    sku: "MBL-005",
    name: "Active Stylus Pen with Tilt Sensing",
    slug: "active-stylus-pen-with-tilt-sensing",
    category: "Mobile",
    priceCents: 8900,
    description: "Pixel-perfect precision with 4096 levels of pressure sensitivity, magnetic wireless pairing, and zero latency.",
  },
  {
    sku: "MBL-006",
    name: "MagSafe Magnetic Power Bank 10,000mAh",
    slug: "magsafe-magnetic-power-bank-10000mah",
    category: "Mobile",
    priceCents: 5900,
    description: "Snap-on wireless portable charger with foldable kickstand, bidirectional 20W USB-C fast charging.",
  },
  {
    sku: "MBL-007",
    name: "Ultra-Thin Carbon Fiber Phone Case",
    slug: "ultra-thin-carbon-fiber-phone-case",
    category: "Mobile",
    priceCents: 4400,
    description: "Crafted from authentic 1500D aramid fiber, 0.6mm thickness, featherweight 12g with camera bezel guard.",
  },
  {
    sku: "MBL-008",
    name: "Qi2 15W Magnetic Car Mount Charger",
    slug: "qi2-15w-magnetic-car-mount-charger",
    category: "Mobile",
    priceCents: 6900,
    description: "Air vent and dashboard mount with powerful neodymium magnets and cryo-boost cooling fan.",
  },
  {
    sku: "MBL-009",
    name: "USB-C OTG Dual Flash Drive 256GB",
    slug: "usb-c-otg-dual-flash-drive-256gb",
    category: "Mobile",
    priceCents: 3900,
    description: "Swiveling dual connector USB-C and USB-A high-speed flash drive for instant phone-to-PC photo backup.",
  },
  {
    sku: "MBL-010",
    name: "Folding Tablet & Phone Stand",
    slug: "folding-tablet-and-phone-stand",
    category: "Mobile",
    priceCents: 2500,
    description: "Pocketable flat-folding metal stand with dual hinge 360-degree rotation and weighted anti-slip base.",
  },

  // 8. Cameras (10)
  {
    sku: "CAM-001",
    name: "4K 60FPS AI Auto-Framing Streaming Webcam",
    slug: "4k-60fps-ai-auto-framing-streaming-webcam",
    category: "Cameras",
    priceCents: 19900,
    description: "Sony Starvis sensor, AI auto-exposure, dual noise-cancelling mics, and physical privacy shutter.",
  },
  {
    sku: "CAM-002",
    name: "Full-Frame Mirrorless Cinema Camera",
    slug: "full-frame-mirrorless-cinema-camera",
    category: "Cameras",
    priceCents: 219900,
    description: "33MP BSI CMOS full-frame sensor recording 4K 120p 10-bit 4:2:2 video with 15+ stops of dynamic range.",
  },
  {
    sku: "CAM-003",
    name: "Compact 4K Action Camera Waterproof",
    slug: "compact-4k-action-camera-waterproof",
    category: "Cameras",
    priceCents: 34900,
    description: "HyperSmooth optical horizon leveling, dual front and rear touchscreens, waterproof to 10m without a case.",
  },
  {
    sku: "CAM-004",
    name: "3-Axis Handheld Gimbal Stabilizer",
    slug: "3-axis-handheld-gimbal-stabilizer",
    category: "Cameras",
    priceCents: 14900,
    description: "Foldable smartphone gimbal with magnetic clamp, AI subject tracking module, and integrated extendable rod.",
  },
  {
    sku: "CAM-005",
    name: "Bi-Color Studio Key Light Panel",
    slug: "bi-color-studio-key-light-panel",
    category: "Cameras",
    priceCents: 12900,
    description: "Edge-lit LED soft light panel with CRI 97+, adjustable 2800K-6500K color temperature, and desk clamp mount.",
  },
  {
    sku: "CAM-006",
    name: "Ultra-Wide 16-35mm F2.8 Lens",
    slug: "ultra-wide-16-35mm-f2-8-lens",
    category: "Cameras",
    priceCents: 119900,
    description: "Premium constant F2.8 aperture wide-angle zoom lens with XD linear autofocus motors and nano AR coating.",
  },
  {
    sku: "CAM-007",
    name: "Wireless Lavalier Microphone Kit",
    slug: "wireless-lavalier-microphone-kit",
    category: "Cameras",
    priceCents: 19900,
    description: "Dual-channel wireless lapel mic system with 200m line-of-sight range and 32-bit float internal onboard recording.",
  },
  {
    sku: "CAM-008",
    name: "Heavy-Duty Carbon Fiber Tripod",
    slug: "heavy-duty-carbon-fiber-tripod",
    category: "Cameras",
    priceCents: 24900,
    description: "8-layer carbon fiber legs with 360-degree arca-swiss fluid ball head, supporting camera rigs up to 15kg.",
  },
  {
    sku: "CAM-009",
    name: "Camera Backpack with Weather Shield",
    slug: "camera-backpack-with-weather-shield",
    category: "Cameras",
    priceCents: 16900,
    description: "Modular padded dividers, quick side-access zipper, dedicated 16-inch laptop pocket, and rain cover.",
  },
  {
    sku: "CAM-010",
    name: "Ring Light 18-inch with Remote",
    slug: "ring-light-18-inch-with-remote",
    category: "Cameras",
    priceCents: 7900,
    description: "Dimmable halo circular catch-light with flexible phone holder, 2m aluminum light stand, and wireless shutter.",
  },

  // 9. Storage (10)
  {
    sku: "STR-001",
    name: "Rugged External NVMe SSD 2TB",
    slug: "rugged-external-nvme-ssd-2tb",
    category: "Storage",
    priceCents: 18900,
    description: "IP67 dust and water resistant shockproof portable drive delivering up to 2000MB/s via USB 3.2 Gen 2x2.",
  },
  {
    sku: "STR-002",
    name: "PCIe Gen5 M.2 SSD 4TB",
    slug: "pcie-gen5-m2-ssd-4tb",
    category: "Storage",
    priceCents: 39900,
    description: "Blistering read speeds up to 14,000 MB/s with extruded aluminum heatsink for extreme gaming and AI workloads.",
  },
  {
    sku: "STR-003",
    name: "4-Bay Network Attached Storage (NAS)",
    slug: "4-bay-network-attached-storage-nas",
    category: "Storage",
    priceCents: 49900,
    description: "Quad-core multimedia NAS enclosure supporting hardware transcoding, snapshots, and 2.5GbE networking.",
  },
  {
    sku: "STR-004",
    name: "Enterprise Grade 18TB Helium Hard Drive",
    slug: "enterprise-grade-18tb-helium-hard-drive",
    category: "Storage",
    priceCents: 32900,
    description: "7200 RPM CMR enterprise SATA drive rated for 2.5 million hours MTBF and 550TB/year workload rating.",
  },
  {
    sku: "STR-005",
    name: "Portable Magnetic SSD for iPhone ProRes",
    slug: "portable-magnetic-ssd-for-iphone-prores",
    category: "Storage",
    priceCents: 13900,
    description: "Snaps directly to phone rear for direct 4K 60fps ProRes recording, transfer speeds up to 1050MB/s.",
  },
  {
    sku: "STR-006",
    name: "High-Endurance microSD Card 512GB",
    slug: "high-endurance-microsd-card-512gb",
    category: "Storage",
    priceCents: 6900,
    description: "V30 A2 rated memory card engineered for continuous dashboard camera and home security video recording.",
  },
  {
    sku: "STR-007",
    name: "Hardware-Encrypted Secure USB Drive",
    slug: "hardware-encrypted-secure-usb-drive",
    category: "Storage",
    priceCents: 8900,
    description: "Military-grade FIPS 140-2 Level 3 certified USB drive with onboard alphanumeric keypad PIN unlock.",
  },
  {
    sku: "STR-008",
    name: "Thunderbolt 4 RAID Dual-Drive Enclosure",
    slug: "thunderbolt-4-raid-dual-drive-enclosure",
    category: "Storage",
    priceCents: 27900,
    description: "Hardware RAID 0/1 desktop enclosure supporting dual NVMe SSDs with up to 2800MB/s sustained transfers.",
  },
  {
    sku: "STR-009",
    name: "Compact CFexpress Type B Card 1TB",
    slug: "compact-cfexpress-type-b-card-1tb",
    category: "Storage",
    priceCents: 34900,
    description: "Continuous burst RAW photography and 8K RAW video card with sustained 1500MB/s minimum write speed.",
  },
  {
    sku: "STR-010",
    name: "USB 3.2 Gen 2x2 Flash Drive 512GB",
    slug: "usb-3-2-gen-2x2-flash-drive-512gb",
    category: "Storage",
    priceCents: 5900,
    description: "Solid-state USB thumb drive reaching 1000MB/s in a compact all-metal zinc alloy keychain housing.",
  },

  // 10. Smart Home (10)
  {
    sku: "SMH-001",
    name: "Smart Matter Home Hub & Gateway",
    slug: "smart-matter-home-hub-and-gateway",
    category: "Smart Home",
    priceCents: 11900,
    description: "Universal smart home bridge connecting Thread, Zigbee, and Wi-Fi devices with local offline automation.",
  },
  {
    sku: "SMH-002",
    name: "Video Doorbell Pro with Night Vision",
    slug: "video-doorbell-pro-with-night-vision",
    category: "Smart Home",
    priceCents: 17900,
    description: "Head-to-toe 2K camera view, radar motion detection, two-way audio, and package drop-off alerts.",
  },
  {
    sku: "SMH-003",
    name: "Smart Motorized Blackout Roller Shades",
    slug: "smart-motorized-blackout-roller-shades",
    category: "Smart Home",
    priceCents: 19900,
    description: "Battery-powered whisper-quiet automated window shades with sunrise/sunset automated scheduling.",
  },
  {
    sku: "SMH-004",
    name: "Smart Thermostat with Room Sensors",
    slug: "smart-thermostat-with-room-sensors",
    category: "Smart Home",
    priceCents: 22900,
    description: "ENERGY STAR certified smart HVAC controller with wireless remote room temperature & occupancy sensors.",
  },
  {
    sku: "SMH-005",
    name: "Zigbee Smart Radiator Valve 4-Pack",
    slug: "zigbee-smart-radiator-valve-4-pack",
    category: "Smart Home",
    priceCents: 14900,
    description: "Multi-zone precision temperature control with open-window detection and weekly programmable heating plans.",
  },
  {
    sku: "SMH-006",
    name: "RGB Ambient Corner Floor Lamp",
    slug: "rgb-ambient-corner-floor-lamp",
    category: "Smart Home",
    priceCents: 8900,
    description: "Minimalist corner aluminum light bar with 16 million colors, music sync modes, and app/voice control.",
  },
  {
    sku: "SMH-007",
    name: "Smart Air Purifier with HEPA H13",
    slug: "smart-air-purifier-with-hepa-h13",
    category: "Smart Home",
    priceCents: 16900,
    description: "True HEPA filtration capturing 99.97% of airborne particles with real-time PM2.5 laser air quality display.",
  },
  {
    sku: "SMH-008",
    name: "Smart Lock with Biometric Fingerprint",
    slug: "smart-lock-with-biometric-fingerprint",
    category: "Smart Home",
    priceCents: 19900,
    description: "Keyless deadbolt with 0.3s optical fingerprint recognition, anti-peep keypad, and remote guest e-keys.",
  },
  {
    sku: "SMH-009",
    name: "Smart Plugs 4-Pack with Energy Monitoring",
    slug: "smart-plugs-4-pack-with-energy-monitoring",
    category: "Smart Home",
    priceCents: 4900,
    description: "15A compact Wi-Fi smart outlets with real-time electricity consumption tracking and schedule timers.",
  },
  {
    sku: "SMH-010",
    name: "Smart Indoor Security Camera 2K Pan-Tilt",
    slug: "smart-indoor-security-camera-2k-pan-tilt",
    category: "Smart Home",
    priceCents: 5900,
    description: "360-degree horizontal coverage with AI human and pet tracking, privacy sleep mode, and local microSD storage.",
  },
];

async function seed() {
  console.log(`Starting seed of ${PRODUCTS_DATA.length} products...`);

  const now = Date.now();

  let insertedCount = 0;
  for (let i = 0; i < PRODUCTS_DATA.length; i++) {
    const item = PRODUCTS_DATA[i];
    if (!item) continue;
    // Stagger created_at so each product has a distinct, monotonic second
    // (i=0 is 100 minutes ago, i=99 is 1 minute ago)
    const createdAt = new Date(now - (PRODUCTS_DATA.length - i) * 60000);

    const query = `
      INSERT INTO products (
        id, sku, name, slug, description, price_cents, currency, category, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        price_cents = EXCLUDED.price_cents,
        category = EXCLUDED.category,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
      RETURNING id, name, sku;
    `;

    const productId = crypto.randomUUID();
    const productRes = await productPool.query(query, [
      productId,
      item.sku,
      item.name,
      item.slug,
      item.description,
      item.priceCents,
      "USD",
      item.category,
      "ACTIVE",
      createdAt,
      createdAt,
    ]);

    const actualId = productRes.rows[0].id;

    // Seed matching inventory record in inventory_db
    const invQty = 50 + (i % 7) * 15; // Realistic varied stock between 50 and 140
    await inventoryPool.query(
      `
      INSERT INTO inventory (id, product_id, available_quantity, reserved_quantity, created_at, updated_at)
      VALUES ($1, $2, $3, 0, $4, $5)
      ON CONFLICT (product_id) DO UPDATE SET
        available_quantity = EXCLUDED.available_quantity,
        updated_at = EXCLUDED.updated_at
      `,
      [crypto.randomUUID(), actualId, invQty, createdAt, createdAt],
    );

    insertedCount++;
  }

  console.log(`✓ Successfully seeded ${insertedCount} products in product_db & inventory_db!`);

  await productPool.end();
  await inventoryPool.end();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
