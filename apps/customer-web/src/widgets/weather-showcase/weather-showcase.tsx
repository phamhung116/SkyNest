import { Badge, Card, Panel } from "@paragliding/ui";
import type { AvailabilityDay } from "@paragliding/api-client";
import {
  formatTemperature,
  getFlightBadgeTone,
  getWeatherKind,
  WeatherSymbol
} from "@/shared/ui/weather-visual";

type WeatherShowcaseProps = {
  days: AvailabilityDay[];
};

export const WeatherShowcase = ({ days }: WeatherShowcaseProps) => {
  const forecast = days.filter((day) => day.weather_available).slice(0, 7);
  const today = forecast[0];

  if (!today) {
    return null;
  }

  const todayKind = getWeatherKind(today);
  const todayLabel = new Date(today.date).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit"
  });
  const shortForecast = forecast.slice(0, 6);

  return (
    <div className="weather-showcase ios-weather-showcase">
      <Card className={`weather-showcase__today ios-weather-card ios-weather-card--${todayKind}`}>
        <Panel className="ios-weather-card__panel">
          <div className="ios-weather-card__top">
            <div>
              <span className="ios-weather-card__eyebrow">Da Nang, Viet Nam</span>
              <h3>Du bao hom nay</h3>
              <p>{todayLabel}</p>
            </div>
            <WeatherSymbol kind={todayKind} />
          </div>

          <div className="ios-weather-card__current">
            <div>
              <strong>{formatTemperature(today.temperature_c)}</strong>
              <span>{today.weather_condition}</span>
            </div>
            <div className="ios-weather-card__flight">
              <small>Dieu kien bay</small>
              <Badge tone={getFlightBadgeTone(today.flight_condition)}>{today.flight_condition}</Badge>
            </div>
          </div>

          <div className="ios-weather-hourly" aria-label="Du bao nhanh">
            {shortForecast.map((item) => {
              const itemKind = getWeatherKind(item);

              return (
                <article key={item.date}>
                  <span>
                    {new Date(item.date).toLocaleDateString("vi-VN", {
                      weekday: "short"
                    })}
                  </span>
                  <WeatherSymbol kind={itemKind} size="sm" />
                  <strong>{formatTemperature(item.temperature_c)}</strong>
                </article>
              );
            })}
          </div>

          <div className="ios-weather-metrics">
            <article>
              <span>Nhiet do</span>
              <strong>{formatTemperature(today.temperature_c, true)}</strong>
            </article>
            <article>
              <span>Suc gio</span>
              <strong>{today.wind_kph} km/h</strong>
            </article>
            <article>
              <span>UV</span>
              <strong>{today.uv_index}</strong>
            </article>
            <article>
              <span>Tam nhin</span>
              <strong>{today.visibility_km} km</strong>
            </article>
          </div>
        </Panel>
      </Card>

      <Card className="weather-showcase__forecast ios-weather-forecast">
        <Panel className="ios-weather-forecast__panel">
          <div className="ios-weather-forecast__head">
            <div>
              <Badge tone="success">7 ngay toi</Badge>
              <h3>Du bao sap toi</h3>
            </div>
          </div>

          <div className="ios-weather-day-list">
            {forecast.map((item) => {
              const itemKind = getWeatherKind(item);

              return (
                <article key={item.date} className="weather-showcase__item ios-weather-day-row">
                  <div className="ios-weather-day-row__date">
                    <strong>
                      {new Date(item.date).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit"
                      })}
                    </strong>
                    <small>{item.weather_condition}</small>
                  </div>
                  <WeatherSymbol kind={itemKind} size="sm" />
                  <span>{formatTemperature(item.temperature_c, true)}</span>
                  <span>{item.wind_kph} km/h</span>
                  <Badge tone={getFlightBadgeTone(item.flight_condition)}>{item.flight_condition}</Badge>
                </article>
              );
            })}
          </div>
        </Panel>
      </Card>
    </div>
  );
};
