interface MealData {
  name?: string;
  ingredients?: string[];
  preparation?: string;
  nutrition?: string;
  substitutions?: string[];
  description?: string;
}

interface Props {
  mealType: string;
  data: MealData | string;
}

export default function MealCard({ mealType, data }: Props) {
  const mealIcons: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎',
    full_day: '📋',
  };

  const icon = mealIcons[mealType] ?? '🍽️';
  const label = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  const renderContent = () => {
    if (typeof data === 'string') {
      return <pre className="meal-raw">{data}</pre>;
    }

    return (
      <div className="meal-details">
        {data.name && <h4 className="meal-name">{data.name}</h4>}
        {data.description && <p className="meal-description">{data.description}</p>}

        {data.ingredients && data.ingredients.length > 0 && (
          <div className="meal-section">
            <strong>Ingredients:</strong>
            <ul className="meal-list">
              {data.ingredients.map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
          </div>
        )}

        {data.preparation && (
          <div className="meal-section">
            <strong>Preparation:</strong>
            <p>{data.preparation}</p>
          </div>
        )}

        {data.nutrition && (
          <div className="meal-section meal-nutrition">
            <strong>Nutrition:</strong> {data.nutrition}
          </div>
        )}

        {data.substitutions && data.substitutions.length > 0 && (
          <div className="meal-section">
            <strong>Substitutions:</strong>
            <ul className="meal-list">
              {data.substitutions.map((sub, i) => (
                <li key={i}>{sub}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="meal-card">
      <div className="meal-header">
        <span className="meal-icon">{icon}</span>
        <span className="meal-type">{label}</span>
      </div>
      {renderContent()}
    </div>
  );
}
