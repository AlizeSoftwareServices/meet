(function() {
  function initMeetEmbeds() {
    var containers = document.querySelectorAll('[data-meet-embed], [data-user][data-event-slug]');
    containers.forEach(function(container) {
      if (container.getAttribute('data-meet-loaded')) return;
      
      var user = container.getAttribute('data-user');
      var slug = container.getAttribute('data-event-slug') || '30min';
      var baseUrl = container.getAttribute('data-url') || 'https://meet.alizesoftwareservices.com';
      
      if (!user) return;

      var iframe = document.createElement('iframe');
      iframe.src = baseUrl + '/book/' + user + '/' + slug + '?embed=true';
      iframe.style.width = '100%';
      iframe.style.height = container.getAttribute('data-height') || '750px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '16px';
      iframe.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'camera; microphone; fullscreen');
      
      container.appendChild(iframe);
      container.setAttribute('data-meet-loaded', 'true');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMeetEmbeds);
  } else {
    initMeetEmbeds();
  }
})();
