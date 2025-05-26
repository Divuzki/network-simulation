// Configuration options for vis-network

// Node options for the graph
export const getNodeOptions = () => {
  return {
    size: 16,
    font: {
      size: 12,
      face: 'Arial'
    },
    borderWidth: 2,
    shadow: true,
    group: 'computer', // Default group
    color: {
      border: '#3B82F6',
      background: '#93C5FD',
      highlight: {
        border: '#2563EB',
        background: '#BFDBFE'
      },
      hover: {
        border: '#2563EB',
        background: '#BFDBFE'
      }
    },
    computer: {
      shape: 'dot',
      size: 16,
      color: {
        border: '#3B82F6',
        background: '#93C5FD',
        highlight: {
          border: '#2563EB',
          background: '#BFDBFE'
        },
        hover: {
          border: '#2563EB',
          background: '#BFDBFE'
        }
      }
    },
    router: {
      shape: 'diamond',
      size: 16,
      color: {
        border: '#EF4444',
        background: '#FCA5A5',
        highlight: {
          border: '#DC2626',
          background: '#FEE2E2'
        },
        hover: {
          border: '#DC2626',
          background: '#FEE2E2'
        }
      }
    },
    smartphone: {
      shape: 'dot',
      size: 10,
      color: {
        border: '#10B981',
        background: '#6EE7B7',
        highlight: {
          border: '#059669',
          background: '#A7F3D0'
        },
        hover: {
          border: '#059669',
          background: '#A7F3D0'
        }
      }
    },
    user: {
      shape: 'circularImage',
      size: 30,
      color: {
        border: '#8B5CF6',
        background: '#C4B5FD',
        highlight: {
          border: '#7C3AED',
          background: '#DDD6FE'
        },
        hover: {
          border: '#7C3AED',
          background: '#DDD6FE'
        }
      },
      image: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
    }
  };
};

// Edge options for the graph
export const getEdgeOptions = () => {
  return {
    width: 2,
    selectionWidth: 3,
    color: {
      color: '#848484',
      highlight: '#848484',
      hover: '#848484',
      inherit: false
    },
    smooth: {
      type: 'continuous',
      forceDirection: 'none',
      roundness: 0.2
    },
    font: {
      size: 10,
      align: 'middle',
      face: 'Arial',
      background: 'rgba(255, 255, 255, 0.7)'
    },
    arrows: {
      to: {
        enabled: false
      }
    }
  };
};