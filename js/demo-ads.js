
document.addEventListener('DOMContentLoaded', () => {

    const ads = [
        {
            tag: 'GAME SPOTLIGHT',
            title: 'Discover Your Next Adventure',
            description: 'Find exciting games worth playing.',
            icon: '🎮',
            button: 'Explore Games',
            color: 'purple'
        },
        {
            tag: 'WEEKLY PICK',
            title: 'Looking for Something New?',
            description: 'Explore games across different genres.',
            icon: '🕹️',
            button: 'Browse Games',
            color: 'blue'
        },
        {
            tag: 'FEATURED DEAL',
            title: 'Your Next Favourite Game Awaits',
            description: 'Discover hidden gems on DiscoverPlay.',
            icon: '🔥',
            button: 'Discover More',
            color: 'orange'
        },
        {
            tag: 'COMMUNITY PICK',
            title: 'What Are You Playing Next?',
            description: 'Find your next gaming experience.',
            icon: '⭐',
            button: 'View Trending',
            color: 'pink'
        }
    ];

    const isInsidePages = window.location.pathname.includes('/pages/');
    const exploreURL = isInsidePages
        ? '../index.html#trending'
        : 'index.html#trending';

    const adBox = document.createElement('aside');
    adBox.id = 'discoverplay-demo-ad';
    adBox.setAttribute('aria-label', 'Demo advertisement');

    adBox.innerHTML = `
        <div class="demo-ad-header">
            <span>ADVERTISEMENT</span>
            <span class="demo-ad-label">DEMO</span>
            <button class="demo-ad-close" aria-label="Close advertisement">&times;</button>
        </div>

        <div class="demo-ad-content">
            <div class="demo-ad-art">
                <span class="demo-ad-icon"></span>
            </div>

            <div class="demo-ad-tag"></div>
            <h3 class="demo-ad-title"></h3>
            <p class="demo-ad-description"></p>

            <a class="demo-ad-button" href="${exploreURL}">
                <span class="demo-ad-button-text"></span>
                <i class="bi bi-arrow-up-right"></i>
            </a>
        </div>

        <div class="demo-ad-footer">
            Simulated advertisement
        </div>
    `;

    document.body.appendChild(adBox);

    const title = adBox.querySelector('.demo-ad-title');
    const description = adBox.querySelector('.demo-ad-description');
    const tag = adBox.querySelector('.demo-ad-tag');
    const icon = adBox.querySelector('.demo-ad-icon');
    const buttonText = adBox.querySelector('.demo-ad-button-text');
    const content = adBox.querySelector('.demo-ad-content');

    let currentAd = 0;
    let rotationTimer;

    function showAd(index) {
        const ad = ads[index];

        content.classList.add('changing');

        setTimeout(() => {
            tag.textContent = ad.tag;
            title.textContent = ad.title;
            description.textContent = ad.description;
            icon.textContent = ad.icon;
            buttonText.textContent = ad.button;

            content.className = `demo-ad-content ${ad.color}`;

            requestAnimationFrame(() => {
                content.classList.remove('changing');
            });
        }, 250);
    }

    function startRotation() {
        clearInterval(rotationTimer);

        rotationTimer = setInterval(() => {
            currentAd = (currentAd + 1) % ads.length;
            showAd(currentAd);
        }, 7000);
    }

    adBox.querySelector('.demo-ad-close').addEventListener('click', () => {
        clearInterval(rotationTimer);
        adBox.remove();
    });

    adBox.addEventListener('mouseenter', () => {
        clearInterval(rotationTimer);
    });

    adBox.addEventListener('mouseleave', () => {
        startRotation();
    });

    showAd(currentAd);
    startRotation();

});
