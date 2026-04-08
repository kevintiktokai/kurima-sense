export interface BlogPost {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    icon: string;
    date: string;
    readTime: string;
    author: {
        name: string;
        role: string;
        avatar: string;
    };
    tags: string[];
}

export const blogPosts: BlogPost[] = [
    {
        slug: 'understanding-ndvi-crop-health',
        title: 'Understanding NDVI: How Satellite Imagery Reveals Your Crop\'s Hidden Health',
        excerpt: 'Learn how Normalized Difference Vegetation Index (NDVI) works and why it\'s the most powerful tool in modern precision agriculture for detecting crop stress before it\'s visible to the naked eye.',
        content: `
## What is NDVI?

NDVI stands for Normalized Difference Vegetation Index — a numerical indicator derived from satellite imagery that quantifies vegetation health. It measures the difference between near-infrared light (which healthy vegetation strongly reflects) and red light (which vegetation absorbs).

The formula is simple: **NDVI = (NIR - Red) / (NIR + Red)**

Values range from -1 to +1, where higher values indicate healthier, denser vegetation.

## Why NDVI Matters for Farmers

Traditional crop scouting means walking your fields and hoping you spot problems before they spread. NDVI changes the game entirely:

- **Early Detection**: NDVI can detect plant stress 1-2 weeks before symptoms become visible to the human eye
- **Full Coverage**: Monitor every square meter of your fields, not just the areas you can physically reach
- **Trend Analysis**: Track vegetation health over time to identify declining zones before they become critical
- **Input Optimization**: Target fertilizer, irrigation, and pesticide applications only where they're needed

## Reading Your NDVI Map

Here's how to interpret NDVI values for common crops:

| NDVI Range | What It Means |
|-----------|---------------|
| 0.0 - 0.1 | Bare soil or water |
| 0.1 - 0.2 | Very sparse vegetation |
| 0.2 - 0.4 | Early growth or stressed crops |
| 0.4 - 0.6 | Moderate vegetation — healthy early/mid season |
| 0.6 - 0.8 | Dense, healthy vegetation — peak growing season |
| 0.8 - 1.0 | Very dense, extremely healthy canopy |

## How KurimaSense Uses NDVI

KurimaSense automatically processes satellite imagery for all your registered fields and converts it into actionable insights:

1. **Automated monitoring** every few days with new satellite passes
2. **Anomaly detection** alerts when NDVI drops unexpectedly in any zone
3. **Historical comparison** against previous seasons and regional benchmarks
4. **AI interpretation** that explains what NDVI changes mean for your specific crop and growth stage

## Getting Started

Add your fields to KurimaSense by drawing boundaries on our satellite map. Within 24 hours, you'll have your first NDVI analysis with AI-powered recommendations specific to your crops and region.

The best part? You don't need to understand the science behind NDVI. Our AI translates the data into plain-language advice: "Your northern field section is showing stress — consider scouting for moisture issues this week."

That's the power of precision agriculture made accessible.
        `,
        category: 'Technology',
        icon: 'satellite_alt',
        date: 'April 7, 2026',
        readTime: '6 min read',
        author: {
            name: 'KurimaSense AI',
            role: 'Agricultural Intelligence',
            avatar: 'K',
        },
        tags: ['NDVI', 'Satellite', 'Crop Health', 'Precision Agriculture'],
    },
    {
        slug: 'fall-armyworm-management-africa',
        title: 'Fall Armyworm in Africa: Early Detection and Integrated Management Strategies',
        excerpt: 'Fall armyworm continues to be one of the biggest threats to maize production in sub-Saharan Africa. Here\'s how to identify, prevent, and manage outbreaks using both traditional and tech-enabled approaches.',
        content: `
## The Fall Armyworm Threat

Since its arrival in Africa in 2016, fall armyworm (*Spodoptera frugiperda*) has caused devastating losses across the continent. Maize — a staple food for over 300 million Africans — is particularly vulnerable, with yield losses ranging from 20% to total crop failure if left unmanaged.

## Identifying Fall Armyworm

Early identification is critical. Here's what to look for:

### Egg Stage
- Egg masses of 100-200 eggs laid on the underside of leaves
- Covered in a fuzzy, felt-like layer of scales
- Hatch within 2-3 days in warm conditions

### Larval Stage (Most Damaging)
- Small larvae are greenish with dark heads
- Mature larvae have a distinctive inverted Y-shape on the head
- Four dark spots arranged in a square on the second-to-last body segment
- Feed in the whorl, creating ragged holes and "windowpane" damage

### Signs of Infestation
- Fresh frass (sawdust-like excrement) in the whorl
- Ragged leaf edges and shot-hole damage
- Skeletonized leaves in severe cases

## Integrated Management Strategy

### Cultural Controls
1. **Early planting** to avoid peak armyworm populations
2. **Crop rotation** with non-host crops like legumes
3. **Intercropping** maize with push-pull companion plants (Desmodium and Brachiaria)
4. **Field sanitation** — remove crop residues that harbor pupae

### Biological Controls
- Encourage natural enemies: parasitoid wasps, predatory beetles, and birds
- Apply *Bacillus thuringiensis* (Bt) sprays for early-instar larvae
- Consider *Metarhizium* fungal biopesticides

### Chemical Controls (When Necessary)
- Scout regularly and apply only when thresholds are reached (5+ larvae per 100 plants)
- Target early-morning or late-afternoon applications when larvae emerge to feed
- Rotate chemical classes to prevent resistance buildup
- Always follow label instructions and observe pre-harvest intervals

## How Technology Helps

KurimaSense uses weather data, regional reports, and AI modeling to predict fall armyworm risk levels for your specific location. Our early warning system can alert you days before conditions become favorable for outbreaks, giving you time to prepare and scout proactively.

## Key Takeaway

The most effective armyworm management combines vigilance, early action, and multiple control tactics. No single method is sufficient — but with regular scouting and technology-assisted early warnings, you can protect your crops and minimize losses.
        `,
        category: 'Pest Management',
        icon: 'bug_report',
        date: 'April 6, 2026',
        readTime: '8 min read',
        author: {
            name: 'KurimaSense AI',
            role: 'Agricultural Intelligence',
            avatar: 'K',
        },
        tags: ['Fall Armyworm', 'Pest Management', 'Maize', 'IPM'],
    },
    {
        slug: 'soil-health-african-smallholders',
        title: 'Building Soil Health: Practical Strategies for African Smallholder Farmers',
        excerpt: 'Healthy soil is the foundation of productive farming. Discover affordable, proven techniques to improve your soil structure, fertility, and water retention — even on degraded land.',
        content: `
## Why Soil Health Matters

Soil is the most important asset on any farm. Healthy soil grows stronger crops, retains more water, resists erosion, and reduces the need for expensive inputs. Yet across Africa, an estimated 65% of arable land is degraded.

The good news? Soil health can be rebuilt, often with techniques that cost little or nothing.

## Understanding Your Soil

Before improving your soil, you need to understand what you're working with:

### Simple Field Tests
1. **Squeeze test**: Grab a handful of moist soil and squeeze. Sandy soil crumbles apart, clay holds a tight ball, loam holds shape but crumbles when poked
2. **Water infiltration**: Pour water on bare soil. If it pools for more than 30 seconds, you have compaction or poor structure
3. **Worm count**: Dig a 30cm cube and count earthworms. Fewer than 5 suggests poor biological activity

### What to Test For
- pH (acidity/alkalinity) — most crops prefer 5.5-7.0
- Organic matter content
- Key nutrients: nitrogen (N), phosphorus (P), potassium (K)
- Micronutrients: zinc, boron, sulfur

## Practical Soil-Building Strategies

### 1. Composting
- Collect crop residues, kitchen waste, and animal manure
- Layer green (nitrogen-rich) and brown (carbon-rich) materials
- Turn every 2-3 weeks for faster decomposition
- Ready in 2-3 months; apply 2-5 tonnes per hectare

### 2. Cover Cropping
- Plant legumes (cowpea, lablab, mucuna) during fallow periods
- Fixes atmospheric nitrogen — free fertilizer worth 30-80 kg N/ha
- Protects soil from erosion and suppresses weeds
- Chop and incorporate before planting your main crop

### 3. Minimum Tillage
- Reduce plowing to preserve soil structure
- Use rip lines or planting basins instead of full tillage
- Maintains mycorrhizal fungal networks that help plants access nutrients
- Reduces fuel and labor costs

### 4. Mulching
- Apply 5-10 cm of organic material around crops
- Retains soil moisture (reduces irrigation needs by 25-50%)
- Moderates soil temperature
- Feeds soil organisms as it decomposes

### 5. Crop Rotation
- Alternate cereal and legume crops each season
- Different root depths break compaction at various levels
- Breaks pest and disease cycles
- Improves nutrient cycling

## The Long Game

Soil improvement is a multi-season investment. You won't see dramatic results overnight, but within 2-3 seasons of consistent soil-building practices, you can expect:

- 20-40% better water retention
- Reduced input costs as natural fertility builds
- More resilient crops that handle drought stress better
- Steadily increasing yields year over year

## How KurimaSense Helps

Our AI advisor can recommend soil improvement strategies tailored to your specific region, crops, and soil conditions. Combined with satellite monitoring that tracks vegetation health improvements over time, you'll have data-driven proof that your soil-building efforts are paying off.

Start building your soil health today — your future harvests will thank you.
        `,
        category: 'Soil Science',
        icon: 'landscape',
        date: 'April 5, 2026',
        readTime: '7 min read',
        author: {
            name: 'KurimaSense AI',
            role: 'Agricultural Intelligence',
            avatar: 'K',
        },
        tags: ['Soil Health', 'Composting', 'Cover Crops', 'Smallholder'],
    },
    {
        slug: 'water-management-drought-resilience',
        title: 'Water-Smart Farming: Building Drought Resilience in a Changing Climate',
        excerpt: 'With rainfall becoming increasingly unpredictable across Africa, water management is no longer optional — it\'s survival. Learn practical techniques to make every drop count.',
        content: `
## The Water Challenge

African agriculture is predominantly rain-fed, making it extremely vulnerable to changing rainfall patterns. Droughts that once occurred every 10 years are now happening every 3-4 years in many regions. But farmers who adopt water-smart practices are thriving even in dry years.

## Rainwater Harvesting

### In-Field Techniques
- **Tied ridges**: Create small basins between crop rows that trap rainwater
- **Zai pits**: Dig 30cm planting holes that concentrate water and compost around the root zone
- **Contour farming**: Plant along contour lines to slow runoff and increase infiltration

### Storage Solutions
- **Farm ponds**: Even a small 10,000-liter pond can provide critical supplemental irrigation
- **Underground tanks**: Reduce evaporation losses by up to 90%
- **Sand dams**: Community-scale storage in seasonal riverbeds

## Efficient Irrigation

When you do irrigate, make every liter count:

- **Drip irrigation**: Delivers water directly to roots with 90-95% efficiency (vs. 40-60% for flood irrigation)
- **Bucket drip kits**: Low-cost drip systems starting from $25 for smallholder plots
- **Schedule by data**: Use soil moisture monitoring and weather forecasts to irrigate only when needed

## Soil Moisture Conservation

- **Mulching** reduces evaporation by 25-50%
- **Minimum tillage** preserves soil structure and water-holding capacity
- **Organic matter** acts as a sponge — each 1% increase in organic matter helps soil hold 75,000 more liters per hectare
- **Windbreaks** reduce wind speed and crop water loss

## Crop Selection for Dry Conditions

Choose varieties bred for water efficiency:
- **Short-season varieties** that mature before dry spells
- **Drought-tolerant cultivars** (e.g., DTMA maize varieties)
- **Alternative crops**: sorghum, millet, cowpea, and pigeon pea naturally need less water than maize

## KurimaSense Weather Intelligence

Our platform provides:
- **Hyperlocal rainfall forecasts** for each of your fields
- **Soil moisture estimates** from satellite data
- **Irrigation scheduling recommendations** based on crop water needs and forecasted weather
- **Drought risk alerts** weeks in advance so you can prepare

Water-smart farming isn't about having more water — it's about using what you have more wisely. Start with one or two techniques this season and build from there.
        `,
        category: 'Climate',
        icon: 'water_drop',
        date: 'April 4, 2026',
        readTime: '7 min read',
        author: {
            name: 'KurimaSense AI',
            role: 'Agricultural Intelligence',
            avatar: 'K',
        },
        tags: ['Water Management', 'Drought', 'Irrigation', 'Climate'],
    },
    {
        slug: 'maximizing-maize-yields-southern-africa',
        title: 'Maximizing Maize Yields in Southern Africa: A Season-by-Season Guide',
        excerpt: 'From land preparation to harvest, this comprehensive guide covers everything you need to know to achieve top maize yields in southern African conditions.',
        content: `
## Overview

Maize is the most important cereal crop in southern Africa, grown by millions of smallholder and commercial farmers. Average yields in the region are 1-2 tonnes per hectare — but with good management, 6-10+ tonnes is achievable. Here's how to close that yield gap.

## Pre-Season: Land Preparation (August-October)

### Soil Preparation
- Test your soil pH and nutrient levels
- Apply lime 2-3 months before planting if pH is below 5.5
- Incorporate crop residues from the previous season
- Plan your rotation — maize after a legume crop benefits from residual nitrogen

### Seed Selection
- Choose varieties suited to your agro-ecological zone and expected rainfall
- Short-season varieties (< 120 days) for low-rainfall areas
- Medium to long-season varieties (130-150 days) for areas with reliable rainfall
- Consider drought-tolerant hybrids as insurance

## Planting (October-November)

### Timing
- Plant with the first effective rains (at least 30mm over a few days)
- Soil temperature should be above 12°C at 10cm depth
- Don't plant too early (risk of false starts) or too late (reduced yield potential)

### Spacing
- **Commercial**: 75cm between rows, 25-30cm between plants (44,000-53,000 plants/ha)
- **Smallholder**: Wider spacing is acceptable with lower inputs, but don't go below 30,000 plants/ha

### Planting Depth
- 5-7cm in moist soil
- Deeper (7-10cm) if topsoil is dry but moisture exists below

## Early Season: Establishment (November-December)

### Weed Control
- The first 6 weeks after emergence are critical — weeds during this period can reduce yields by 50-80%
- Apply pre-emergence herbicide within 3 days of planting
- Follow up with early post-emergence control at the 2-4 leaf stage
- Hand weeding is effective but must be timely

### Fertilization
- **Basal**: Apply phosphorus and potassium at planting (e.g., Compound D at 200-300 kg/ha)
- **Top dress**: Apply nitrogen at the 6-leaf stage (e.g., AN at 200 kg/ha) — this is the most critical application

## Mid-Season: Growth (December-February)

### Scouting
- Check for fall armyworm weekly during the whorl stage
- Monitor for stalk borer, especially at plant nodes
- Look for leaf diseases: grey leaf spot, northern leaf blight, rust
- Check soil moisture status regularly

### Water Management
- Maize needs 500-800mm of well-distributed rainfall
- The tasseling/silking stage (VT-R1) is most sensitive to drought
- If irrigating, ensure adequate water during this critical 2-week window

## Late Season: Maturity (February-April)

### Monitoring
- Track grain fill progress
- Watch for ear rots, especially if late rains occur
- Assess when to stop irrigating (black layer formation)

### Harvest Timing
- Harvest at 12.5-14% grain moisture for best quality
- Delayed harvest increases risk of ear rot and insect damage
- Test moisture with a meter or the "fingernail test" — grain should be hard and not dent easily

## How KurimaSense Supports Your Maize Season

Our platform tracks your maize through every growth stage:
- **Planting date tracking** with growth stage predictions
- **NDVI monitoring** for early stress detection
- **Weather-based pest risk alerts** throughout the season
- **Yield forecasting** that improves as the season progresses
- **AI-powered recommendations** specific to your variety, soil, and conditions

Whether you're farming 1 hectare or 1,000, data-driven management is the path to consistently higher yields.
        `,
        category: 'Crop Guide',
        icon: 'grass',
        date: 'April 3, 2026',
        readTime: '10 min read',
        author: {
            name: 'KurimaSense AI',
            role: 'Agricultural Intelligence',
            avatar: 'K',
        },
        tags: ['Maize', 'Yield', 'Southern Africa', 'Crop Management'],
    },
    {
        slug: 'ai-agriculture-future-africa',
        title: 'How AI is Transforming Agriculture in Africa: Beyond the Hype',
        excerpt: 'Artificial intelligence in farming isn\'t science fiction — it\'s already helping African farmers make better decisions. Here\'s what\'s real, what\'s coming, and how you can benefit today.',
        content: `
## The AI Revolution in Agriculture

While the global conversation about AI often centers on chatbots and self-driving cars, some of the most impactful AI applications are happening quietly in agriculture — particularly in Africa, where the technology addresses real, urgent needs.

## What AI Can Do Today

### Satellite-Based Crop Monitoring
AI processes vast amounts of satellite imagery to detect patterns invisible to the human eye:
- Identify water stress before plants show visual symptoms
- Map crop health across thousands of hectares in minutes
- Track growth progress and predict yields weeks before harvest

### Pest and Disease Identification
Computer vision AI can identify pest damage and plant diseases from photographs:
- Snap a photo of a damaged leaf and get an instant diagnosis
- Receive treatment recommendations specific to the identified problem
- Early detection prevents small issues from becoming catastrophic losses

### Weather and Climate Intelligence
AI models combine satellite data, ground observations, and historical patterns to provide:
- Hyperlocal weather forecasts tailored to individual farms
- Seasonal climate outlooks for planting decisions
- Spray window recommendations based on wind, rain, and humidity forecasts

### Smart Advisory
AI-powered advisory systems act as a virtual agronomist:
- Answer farming questions in natural language
- Provide personalized recommendations based on your specific conditions
- Available 24/7 via mobile phone — no appointment needed

## What's Coming Next

### Predictive Market Intelligence
- AI-powered crop price forecasting to help farmers decide when to sell
- Supply chain optimization to reduce post-harvest losses
- Market matching to connect farmers directly with buyers

### Automated Precision Application
- Drone-based targeted spraying guided by AI analysis
- Variable rate technology that adjusts inputs meter by meter
- Automated irrigation scheduling based on real-time sensor data

### Collective Intelligence
- Aggregated anonymous data from thousands of farms to identify regional trends
- Peer benchmarking to compare practices and outcomes
- Community-wide early warning systems for pest and disease outbreaks

## The KurimaSense Approach

We believe AI in agriculture should be:

1. **Accessible** — works on any smartphone, with simple interfaces and plain-language advice
2. **Affordable** — free tier available for all farmers, regardless of scale
3. **African-first** — trained on African crops, conditions, and farming practices, not adapted from temperate-region models
4. **Actionable** — every insight comes with a clear "what to do next" recommendation

## Getting Started with AI Farming

You don't need to understand how AI works to benefit from it. Start by:
1. Creating a free KurimaSense account
2. Adding your fields to the satellite map
3. Telling us what you're growing

From there, the AI works in the background — monitoring your fields, analyzing weather patterns, and sending you timely alerts and recommendations. It's like having an expert agronomist watching over your farm around the clock.

The future of African agriculture is intelligent, data-driven, and farmer-centric. And it's already here.
        `,
        category: 'Innovation',
        icon: 'smart_toy',
        date: 'April 2, 2026',
        readTime: '8 min read',
        author: {
            name: 'KurimaSense AI',
            role: 'Agricultural Intelligence',
            avatar: 'K',
        },
        tags: ['AI', 'Innovation', 'AgTech', 'Future of Farming'],
    },
];
